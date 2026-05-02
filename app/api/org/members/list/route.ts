import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined

  // Fetch human members and active (non-revoked) agent users in parallel.
  // Agent users have no Member row, so they need a separate query — without
  // this, anywhere the UI uses the members list as the assignable-user
  // universe (kanban, task edit dialog) would silently drop agent assignees.
  // Match the "active token" definition used by `resolveMentionRecipients`
  // and `resolveAgentContext`: not revoked AND not expired. Without the
  // expiry mirror, expired agents would still show up in assignee pickers
  // even though they can't authenticate or receive notifications anymore.
  const now = new Date()
  const [members, agentTokens] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: org.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentToken.findMany({
      where: {
        organizationId: org.organizationId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(projectId && {
          AND: [
            {
              OR: [
                { projectIds: { isEmpty: true } },
                { projectIds: { has: projectId } },
              ],
            },
          ],
        }),
      },
      select: {
        agentUser: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
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

  const agentRows = agentTokens.map((t) => ({
    id: t.agentUser.id,
    name: t.agentUser.name,
    email: t.agentUser.email,
    image: t.agentUser.image,
    isAgent: true,
    role: "agent" as const,
  }))

  return Response.json([...humanRows, ...agentRows])
}
