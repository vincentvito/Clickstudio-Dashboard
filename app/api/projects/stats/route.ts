import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const projects = await prisma.project.findMany({
    where: { organizationId: org.organizationId },
    include: { transitions: { orderBy: { at: "asc" } } },
  })

  const durations = { toLive: [] as number[], inBacklog: [] as number[], inBuild: [] as number[] }
  let liveCount = 0

  for (const p of projects) {
    if (p.state === "Live") liveCount++

    const creation = p.transitions.find((t) => t.fromState === null)
    const createdAt = (creation?.at ?? p.createdAt).getTime()
    const firstInBuild = p.transitions.find((t) => t.toState === "InBuild")?.at.getTime() ?? null
    const firstLive = p.transitions.find((t) => t.toState === "Live")?.at.getTime() ?? null
    const leftBacklog = p.transitions.find((t) => t.fromState === "Backlog")?.at.getTime() ?? null

    if (firstLive !== null) durations.toLive.push(firstLive - createdAt)
    if (leftBacklog !== null) durations.inBacklog.push(leftBacklog - createdAt)
    if (firstInBuild !== null && firstLive !== null) {
      durations.inBuild.push(firstLive - firstInBuild)
    }
  }

  const avg = (xs: number[]) =>
    xs.length === 0 ? null : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)

  return Response.json({
    avgTimeToLiveMs: avg(durations.toLive),
    avgTimeInBacklogMs: avg(durations.inBacklog),
    avgTimeInBuildMs: avg(durations.inBuild),
    liveCount,
    totalCount: projects.length,
  })
}
