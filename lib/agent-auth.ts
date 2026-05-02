import { NextRequest } from "next/server"
import { createHash, randomBytes } from "crypto"
import prisma from "@/lib/prisma"

export type AgentScope =
  | "org:read"
  | "projects:read"
  | "projects:write"
  | "tasks:read"
  | "tasks:write"
  | "logs:write"
  | "ideas:read"
  | "ideas:write"

export const ALL_SCOPES: AgentScope[] = [
  "org:read",
  "projects:read",
  "projects:write",
  "tasks:read",
  "tasks:write",
  "logs:write",
  "ideas:read",
  "ideas:write",
]

// Scopes that operate on org-level resources and ignore the per-token
// `projectIds` allow-list. Combining these with a non-empty `projectIds` is
// rejected at mint time so the UI's "scoped to specific projects" promise
// holds end-to-end.
export const ORG_WIDE_SCOPES: AgentScope[] = ["org:read", "ideas:read", "ideas:write"]

export function isOrgWideScope(scope: string): boolean {
  return (ORG_WIDE_SCOPES as string[]).includes(scope)
}

export const TOKEN_PREFIX = "ccs_"

export function generateToken(): { full: string; hash: string; prefix: string } {
  const random = randomBytes(32).toString("base64url")
  const full = `${TOKEN_PREFIX}${random}`
  const hash = createHash("sha256").update(full).digest("hex")
  // prefix shown in UI to disambiguate tokens — short enough not to leak entropy
  const prefix = full.slice(0, 12)
  return { full, hash, prefix }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export interface AgentContext {
  tokenId: string
  organizationId: string
  agentUserId: string
  agentName: string
  scopes: AgentScope[]
  projectIds: string[] // empty array = all projects
}

function readBearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

export async function resolveAgentContext(req: NextRequest): Promise<AgentContext | null> {
  const token = readBearer(req)
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null

  const tokenHash = hashToken(token)

  const record = await prisma.agentToken.findUnique({
    where: { tokenHash },
    include: { agentUser: { select: { id: true, name: true } } },
  })

  if (!record) return null
  if (record.revokedAt) return null
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) return null

  // Best-effort lastUsedAt update (don't await — non-critical, don't slow request)
  prisma.agentToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return {
    tokenId: record.id,
    organizationId: record.organizationId,
    agentUserId: record.agentUserId,
    agentName: record.agentUser.name,
    scopes: record.scopes as AgentScope[],
    projectIds: record.projectIds,
  }
}

export function hasScope(ctx: AgentContext, scope: AgentScope): boolean {
  return ctx.scopes.includes(scope)
}

export function canAccessProject(ctx: AgentContext, projectId: string): boolean {
  if (ctx.projectIds.length === 0) return true
  return ctx.projectIds.includes(projectId)
}

export async function requireAgent(
  req: NextRequest,
  scope: AgentScope,
): Promise<AgentContext | Response> {
  const ctx = await resolveAgentContext(req)
  if (!ctx) {
    return Response.json(
      { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
      { status: 401 },
    )
  }
  if (!hasScope(ctx, scope)) {
    return Response.json(
      { error: "Forbidden", hint: `Token is missing required scope: ${scope}` },
      { status: 403 },
    )
  }
  return ctx
}

export function isAgentResponse(v: AgentContext | Response): v is Response {
  return v instanceof Response
}
