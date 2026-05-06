import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"

// Bearer-authed mirror of /api/org/members/list. Required so CLI agents can
// resolve aliases like `@vlad` to a real userId before assigning a task —
// the session-only endpoint rejects bearer tokens, so without this the CLI
// has no way to enumerate the assignable user universe.
export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "org:read")
  if (isAgentResponse(ctx)) return ctx

  const now = new Date()
  const [members, agentTokens] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentToken.findMany({
      where: {
        organizationId: ctx.organizationId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        agentUser: {
          select: { id: true, name: true, email: true, image: true, isAgent: true },
        },
      },
    }),
  ])

  const humanRows = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    isAgent: m.user.isAgent,
    role: m.role,
  }))

  // Dedupe agents — one agentUser can in principle have multiple tokens, and
  // the alias resolver doesn't want duplicate candidates.
  const seen = new Set(humanRows.map((m) => m.id))
  const agentRows: typeof humanRows = []
  for (const t of agentTokens) {
    if (seen.has(t.agentUser.id)) continue
    seen.add(t.agentUser.id)
    agentRows.push({
      id: t.agentUser.id,
      name: t.agentUser.name,
      email: t.agentUser.email,
      image: t.agentUser.image,
      isAgent: true,
      role: "agent",
    })
  }

  return Response.json([...humanRows, ...agentRows])
}
