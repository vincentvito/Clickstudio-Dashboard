import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { createNotifications } from "@/lib/notifications"
import { diffMentions } from "@/lib/mentions"
import { resolveMentionRecipients } from "@/lib/mention-recipients"

const ASSIGNEE_SELECT = { id: true, name: true, email: true, image: true, isAgent: true }

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
    // Members AND active agents are valid assignees — without including
    // agents here, a human edit that re-saves the assignee list would drop
    // any agent assignees that were on the task. Project-scoped agents are
    // filtered out so a human can't accidentally hand a task to an agent
    // whose token won't let it act on that project.
    const validIds = await resolveMentionRecipients(org.organizationId, body.assigneeIds, {
      projectId: task.projectId,
    })
    assigneesUpdate = {
      assignees: { set: validIds.map((id) => ({ id })) },
    }
    const existingIds = new Set(task.assignees.map((a) => a.id))
    newAssigneeIds = validIds.filter((id) => !existingIds.has(id))
  }

  const columnChanged =
    body.columnId !== undefined && body.columnId !== task.columnId

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.columnId !== undefined && { columnId: body.columnId }),
        ...(body.section !== undefined && { section: body.section }),
        ...(body.position !== undefined && { position: body.position }),
        ...assigneesUpdate,
      },
      include: {
        assignees: { select: ASSIGNEE_SELECT },
      },
    })
    if (columnChanged) {
      await tx.taskTransition.create({
        data: {
          taskId: result.id,
          fromColumnId: task.columnId,
          toColumnId: body.columnId,
          userId: org.user.id,
        },
      })
    }
    return result
  })

  const inviterName = org.user.name || org.user.email
  const taskLink = `/dashboard/${updated.projectId}?tab=tasks&task=${updated.id}`

  const newlyAssigned = newAssigneeIds.filter((id) => id !== org.user.id)

  // Only fire task_mention for people mentioned in this update who weren't
  // already mentioned before, and aren't being assigned in the same patch.
  let newlyMentioned: string[] = []
  if (body.description !== undefined && body.description !== task.description) {
    newlyMentioned = diffMentions(task.description, body.description).filter(
      (id) => id !== org.user.id && !newlyAssigned.includes(id),
    )
  }

  const mentionRecipients = newlyMentioned.length
    ? await resolveMentionRecipients(org.organizationId, newlyMentioned, {
        projectId: task.projectId,
      })
    : []

  await createNotifications([
    ...newlyAssigned.map((userId) => ({
      userId,
      type: "task_assigned" as const,
      message: `${inviterName} assigned you to "${updated.title}"`,
      link: taskLink,
    })),
    ...mentionRecipients.map((userId) => ({
      userId,
      type: "task_mention" as const,
      message: `${inviterName} mentioned you in "${updated.title}"`,
      link: taskLink,
    })),
  ])

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
