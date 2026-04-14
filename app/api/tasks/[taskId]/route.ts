import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { createNotifications } from "@/lib/notifications"

const ASSIGNEE_SELECT = { id: true, name: true, email: true, image: true }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: org.organizationId } },
    include: { assignees: { select: { id: true } } },
  })

  if (!task) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()

  let assigneesUpdate: Record<string, unknown> | undefined
  let newAssigneeIds: string[] = []
  if (body.assigneeIds !== undefined) {
    const validMembers = await prisma.member.findMany({
      where: { organizationId: org.organizationId, userId: { in: body.assigneeIds } },
      select: { userId: true },
    })
    const validIds = validMembers.map((m) => m.userId)
    assigneesUpdate = {
      assignees: { set: validIds.map((id) => ({ id })) },
    }
    const existingIds = new Set(task.assignees.map((a) => a.id))
    newAssigneeIds = validIds.filter((id) => !existingIds.has(id))
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.columnId !== undefined && { columnId: body.columnId }),
      ...(body.section !== undefined && { section: body.section }),
      ...(body.position !== undefined && { position: body.position }),
      ...assigneesUpdate,
    },
    include: {
      assignees: { select: ASSIGNEE_SELECT },
    },
  })

  // Notify newly added assignees (not the person making the change)
  if (newAssigneeIds.length > 0) {
    const inviterName = org.user.name || org.user.email
    await createNotifications(
      newAssigneeIds
        .filter((id) => id !== org.user.id)
        .map((userId) => ({
          userId,
          type: "task_assigned",
          message: `${inviterName} assigned you to "${updated.title}"`,
          link: `/dashboard/${updated.projectId}?tab=tasks&task=${updated.id}`,
        })),
    )
  }

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: org.organizationId } },
  })

  if (!task) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.task.delete({ where: { id: taskId } })

  return Response.json({ ok: true })
}
