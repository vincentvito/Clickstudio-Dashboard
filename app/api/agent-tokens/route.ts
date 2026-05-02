import { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"
import { ALL_SCOPES, generateToken, isOrgWideScope, type AgentScope } from "@/lib/agent-auth"

export async function GET() {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "create")) return forbidden()

  const tokens = await prisma.agentToken.findMany({
    where: { organizationId: org.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scopes: true,
      projectIds: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
      agentUser: { select: { id: true, name: true } },
    },
  })

  return Response.json(tokens)
}

export async function POST(req: NextRequest) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "create")) return forbidden()

  const body = await req.json().catch(() => ({}))
  const name: string = (body.name ?? "").trim()
  const scopes: string[] = Array.isArray(body.scopes) ? body.scopes : []
  const projectIds: string[] = Array.isArray(body.projectIds) ? body.projectIds : []
  const expiresAt: string | null = body.expiresAt ?? null

  if (!name) {
    return Response.json({ error: "Token name is required" }, { status: 400 })
  }

  const validScopes = scopes.filter((s): s is AgentScope =>
    (ALL_SCOPES as string[]).includes(s),
  )
  if (validScopes.length === 0) {
    return Response.json({ error: "At least one valid scope is required" }, { status: 400 })
  }

  // Validate project scoping if any provided
  if (projectIds.length > 0) {
    // Org-wide scopes (ideas:*, org:read) ignore projectIds at the consumer
    // side, so combining them with project scoping would silently grant
    // broader access than the operator expects. Reject the combination.
    const orgWideRequested = validScopes.filter(isOrgWideScope)
    if (orgWideRequested.length > 0) {
      return Response.json(
        {
          error: `Org-wide scopes cannot be combined with project scoping: ${orgWideRequested.join(", ")}`,
          hint: "Mint a separate token for org-wide access, or remove these scopes from this token.",
        },
        { status: 400 },
      )
    }

    const owned = await prisma.project.findMany({
      where: { id: { in: projectIds }, organizationId: org.organizationId },
      select: { id: true },
    })
    if (owned.length !== projectIds.length) {
      return Response.json({ error: "One or more projects do not belong to this org" }, { status: 400 })
    }
  }

  const expiresAtDate = expiresAt ? new Date(expiresAt) : null
  if (expiresAtDate && Number.isNaN(expiresAtDate.getTime())) {
    return Response.json({ error: "Invalid expiresAt" }, { status: 400 })
  }

  const { full, hash, prefix } = generateToken()

  const result = await prisma.$transaction(async (tx) => {
    const agentUserId = randomUUID()
    // Synthetic email keeps the @@unique([email]) constraint satisfied without
    // colliding with real user accounts.
    const agentUser = await tx.user.create({
      data: {
        id: agentUserId,
        name,
        email: `agent-${agentUserId}@agents.clickstudio.local`,
        emailVerified: true,
        isAgent: true,
      },
    })

    const token = await tx.agentToken.create({
      data: {
        organizationId: org.organizationId,
        agentUserId: agentUser.id,
        name,
        tokenHash: hash,
        tokenPrefix: prefix,
        scopes: validScopes,
        projectIds,
        createdByUserId: org.user.id,
        expiresAt: expiresAtDate,
      },
    })

    return token
  })

  // The full token is returned ONCE on creation. UI must show a one-time reveal.
  return Response.json(
    {
      id: result.id,
      name: result.name,
      tokenPrefix: result.tokenPrefix,
      scopes: result.scopes,
      projectIds: result.projectIds,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
      token: full,
    },
    { status: 201 },
  )
}
