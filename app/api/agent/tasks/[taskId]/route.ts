import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireAgent,
  isAgentResponse,
  canAccessProject,
} from "@/lib/agent-auth"
import { diffMentions } from "@/lib/mentions"
import { createNotifications } from "@/lib/notifications"
import { resolveMentionRecipients } from "@/lib/mention-recipients"

const ASSIGNEE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  isAgent: true,
} as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const ctx = await requireAgent(req, "tasks:read")
  if (isAgentResponse(ctx)) return ctx

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: ctx.organizationId } },
    include: { assignees: { select: ASSIGNEE_SELECT } },
  })

  if (!task || !canAccessProject(ctx, task.projectId)) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    columnId: task.columnId,
    section: task.section,
    position: task.position,
    assignees: task.assignees,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const ctx = await requireAgent(req, "tasks:write")
  if (isAgentResponse(ctx)) return ctx

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: ctx.organizationId } },
    include: { assignees: { select: { id: true } } },
  })

  if (!task || !canAccessProject(ctx, task.projectId)) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  // Accept "status" as a friendly alias for columnId so CLI users can
  // write `tasks update <id> --status doing` without knowing the schema.
  const nextColumnId: string | undefined = body.columnId ?? body.status
  const columnChanged = nextColumnId !== undefined && nextColumnId !== task.columnId

  // Assignee replacement: full-set replace via `assigneeIds`, mirroring the
  // session-auth PATCH route. The CLI does read-modify-write for additive
  // semantics (--add-assignee / --remove-assignee), so we don't need to
  // expose those server-side.
  const rawAssigneeIds: unknown = body.assigneeIds
  const hasAssigneeUpdate =
    Array.isArray(rawAssigneeIds) && rawAssigneeIds.every((v) => typeof v === "string")

  let assigneesUpdate: { assignees: { set: { id: string }[] } } | undefined
  let newlyAssigned: string[] = []
  if (hasAssigneeUpdate) {
    const validIds = await resolveMentionRecipients(
      ctx.organizationId,
      rawAssigneeIds as string[],
      { projectId: task.projectId },
    )
    assigneesUpdate = { assignees: { set: validIds.map((id) => ({ id })) } }
    const existingIds = new Set(task.assignees.map((a) => a.id))
    newlyAssigned = validIds.filter((id) => !existingIds.has(id) && id !== ctx.agentUserId)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(nextColumnId !== undefined && { columnId: nextColumnId }),
        ...(body.section !== undefined && { section: body.section as never }),
        ...(body.position !== undefined && { position: body.position }),
        ...assigneesUpdate,
      },
      include: { assignees: { select: ASSIGNEE_SELECT } },
    })
    if (columnChanged) {
      await tx.taskTransition.create({
        data: {
          taskId: result.id,
          fromColumnId: task.columnId,
          toColumnId: nextColumnId!,
          userId: ctx.agentUserId,
        },
      })
    }
    return result
  })

  // Notifications: task_assigned for newly added assignees, task_mention for
  // anyone newly @-mentioned in the description who isn't already being
  // assigned in this same patch (avoids double-notifying).
  const actorName = `\u{1F916} ${ctx.agentName}`
  const taskLink = `/dashboard/${updated.projectId}?tab=tasks&task=${updated.id}`

  let newlyMentioned: string[] = []
  if (body.description !== undefined && body.description !== task.description) {
    newlyMentioned = diffMentions(task.description, body.description).filter(
      (id) => id !== ctx.agentUserId && !newlyAssigned.includes(id),
    )
  }
  const mentionRecipients = newlyMentioned.length
    ? await resolveMentionRecipients(ctx.organizationId, newlyMentioned, {
        projectId: task.projectId,
      })
    : []

  if (newlyAssigned.length > 0 || mentionRecipients.length > 0) {
    await createNotifications([
      ...newlyAssigned.map((userId) => ({
        userId,
        type: "task_assigned" as const,
        message: `${actorName} assigned you to "${updated.title}"`,
        link: taskLink,
      })),
      ...mentionRecipients.map((userId) => ({
        userId,
        type: "task_mention" as const,
        message: `${actorName} mentioned you in "${updated.title}"`,
        link: taskLink,
      })),
    ])
  }

  return Response.json({
    id: updated.id,
    title: updated.title,
    description: updated.description,
    columnId: updated.columnId,
    section: updated.section,
    position: updated.position,
    assignees: updated.assignees,
    updatedAt: updated.updatedAt,
  })
}

// DELETE: agents need this to clean up their own probe/test tasks. Required
// scope is `tasks:write` (same as PATCH) — there's no separate "delete" scope
// in the coarse set, and elevating delete past write would surprise CLI users.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const ctx = await requireAgent(req, "tasks:write")
  if (isAgentResponse(ctx)) return ctx

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: ctx.organizationId } },
    select: { id: true, projectId: true, title: true },
  })

  if (!task || !canAccessProject(ctx, task.projectId)) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.task.delete({ where: { id: taskId } })

  return Response.json({ ok: true, id: task.id, title: task.title })
}
