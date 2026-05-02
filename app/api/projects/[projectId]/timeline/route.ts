import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { stateFromPrisma } from "@/lib/enum-map"

const USER_SELECT = { id: true, name: true, email: true, image: true, isAgent: true }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.organizationId },
    select: { id: true },
  })
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const [projectTransitions, taskTransitions] = await Promise.all([
    prisma.projectStateTransition.findMany({
      where: { projectId },
      orderBy: { at: "desc" },
      include: { user: { select: USER_SELECT } },
    }),
    prisma.taskTransition.findMany({
      where: { task: { projectId } },
      orderBy: { at: "desc" },
      include: {
        user: { select: USER_SELECT },
        task: { select: { id: true, title: true } },
      },
    }),
  ])

  const entries = [
    ...projectTransitions.map((t) => ({
      id: `ps_${t.id}`,
      kind: "project_state" as const,
      at: t.at.toISOString(),
      user: t.user,
      fromState: t.fromState ? stateFromPrisma(t.fromState) : null,
      toState: stateFromPrisma(t.toState),
    })),
    ...taskTransitions.map((t) => ({
      id: `tc_${t.id}`,
      kind: "task_column" as const,
      at: t.at.toISOString(),
      user: t.user,
      taskId: t.task.id,
      taskTitle: t.task.title,
      fromColumnId: t.fromColumnId,
      toColumnId: t.toColumnId,
    })),
  ].sort((a, b) => (a.at > b.at ? -1 : 1))

  return Response.json({ entries })
}
