import prisma from "@/lib/prisma"

interface ResolveOpts {
  /**
   * If set, agent recipients are constrained to tokens whose `projectIds` is
   * either empty (org-wide) or contains this project. This is the gate that
   * prevents a project-scoped agent from receiving notifications about
   * tasks/notes/logs in projects outside its scope. Pass it on every
   * project-rooted notification fanout.
   */
  projectId?: string
}

/**
 * Returns the subset of `candidateUserIds` who can legitimately receive a
 * mention or assignment notification in this org. Includes:
 *   - human Member rows of the org
 *   - agent users with at least one *active* AgentToken in the org
 *     (active = not revoked AND not expired)
 *
 * When `opts.projectId` is provided, agent recipients are further filtered
 * by the token's `projectIds` allow-list.
 */
export async function resolveMentionRecipients(
  organizationId: string,
  candidateUserIds: string[],
  opts: ResolveOpts = {},
): Promise<string[]> {
  if (candidateUserIds.length === 0) return []

  const now = new Date()

  // The agent token allow-list filter: token must be unexpired, not revoked,
  // and (if a project is in play) either org-wide or scoped to that project.
  const tokenWhere = {
    organizationId,
    revokedAt: null,
    agentUserId: { in: candidateUserIds },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    ...(opts.projectId && {
      AND: [
        {
          OR: [
            { projectIds: { isEmpty: true } },
            { projectIds: { has: opts.projectId } },
          ],
        },
      ],
    }),
  }

  const [members, agents] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId, userId: { in: candidateUserIds } },
      select: { userId: true },
    }),
    prisma.agentToken.findMany({
      where: tokenWhere,
      select: { agentUserId: true },
    }),
  ])

  const allowed = new Set<string>()
  for (const m of members) allowed.add(m.userId)
  for (const a of agents) allowed.add(a.agentUserId)
  return [...allowed]
}
