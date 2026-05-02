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
  })

  if (!task || !canAccessProject(ctx, task.projectId)) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  // Accept "status" as a friendly alias for columnId so CLI users can
  // write `tasks update <id> --status doing` without knowing the schema.
  const nextColumnId: string | undefined = body.columnId ?? body.status
  const columnChanged = nextColumnId !== undefined && nextColumnId !== task.columnId

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(nextColumnId !== undefined && { columnId: nextColumnId }),
        ...(body.section !== undefined && { section: body.section as never }),
        ...(body.position !== undefined && { position: body.position }),
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

  // Notify newly @-mentioned recipients in description edits — same shape as
  // the session-auth task PATCH route.
  if (body.description !== undefined && body.description !== task.description) {
    const newlyMentioned = diffMentions(task.description, body.description).filter(
      (id) => id !== ctx.agentUserId,
    )
    const recipients = await resolveMentionRecipients(ctx.organizationId, newlyMentioned, {
      projectId: task.projectId,
    })
    if (recipients.length > 0) {
      const actorName = `\u{1F916} ${ctx.agentName}`
      const taskLink = `/dashboard/${updated.projectId}?tab=tasks&task=${updated.id}`
      await createNotifications(
        recipients.map((userId) => ({
          userId,
          type: "task_mention" as const,
          message: `${actorName} mentioned you in "${updated.title}"`,
          link: taskLink,
        })),
      )
    }
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
