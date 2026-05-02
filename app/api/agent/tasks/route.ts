import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireAgent,
  isAgentResponse,
  canAccessProject,
} from "@/lib/agent-auth"
import { extractMentionedUserIds } from "@/lib/mentions"
import { createNotifications } from "@/lib/notifications"
import { resolveMentionRecipients } from "@/lib/mention-recipients"

const ASSIGNEE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  isAgent: true,
} as const

export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "tasks:read")
  if (isAgentResponse(ctx)) return ctx

  const url = new URL(req.url)
  const projectId = url.searchParams.get("project") ?? url.searchParams.get("projectId")

  if (!projectId) {
    return Response.json({ error: "?project=<id> is required" }, { status: 400 })
  }
  if (!canAccessProject(ctx, projectId)) {
    return Response.json({ error: "Forbidden", hint: "Project not in token scope" }, { status: 403 })
  }

  // Make sure the project exists in this org
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ section: "asc" }, { position: "asc" }],
    include: { assignees: { select: ASSIGNEE_SELECT } },
  })

  return Response.json(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      columnId: t.columnId,
      section: t.section,
      position: t.position,
      assignees: t.assignees,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireAgent(req, "tasks:write")
  if (isAgentResponse(ctx)) return ctx

  const body = await req.json().catch(() => ({}))
  const projectId: string | undefined = body.projectId ?? body.project
  const title: string = (body.title ?? "").trim()

  if (!projectId) {
    return Response.json({ error: "projectId is required" }, { status: 400 })
  }
  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400 })
  }
  if (!canAccessProject(ctx, projectId)) {
    return Response.json({ error: "Forbidden", hint: "Project not in token scope" }, { status: 403 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const description: string = typeof body.description === "string" ? body.description : ""
  const columnId: string = body.columnId ?? body.status ?? "todo"
  const section: string = body.section ?? "Product"
  const assignToSelf: boolean = body.assignToSelf !== false // default true

  const maxPosition = await prisma.task.aggregate({
    where: { projectId, columnId },
    _max: { position: true },
  })

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title,
        description,
        columnId,
        section: section as never,
        position: (maxPosition._max.position ?? -1) + 1,
        projectId,
        ...(assignToSelf && {
          assignees: { connect: [{ id: ctx.agentUserId }] },
        }),
      },
      include: { assignees: { select: ASSIGNEE_SELECT } },
    })
    await tx.taskTransition.create({
      data: {
        taskId: created.id,
        fromColumnId: null,
        toColumnId: columnId,
        userId: ctx.agentUserId,
      },
    })
    return created
  })

  // Mirror the session-auth task endpoint's mention notifications. Without
  // this, an agent that creates a task with an @-mention in the description
  // never alerts the mentioned teammate.
  const mentionedIds = extractMentionedUserIds(description).filter(
    (id) => id !== ctx.agentUserId,
  )
  const recipients = await resolveMentionRecipients(ctx.organizationId, mentionedIds, {
    projectId,
  })
  if (recipients.length > 0) {
    const actorName = `\u{1F916} ${ctx.agentName}`
    const taskLink = `/dashboard/${projectId}?tab=tasks&task=${task.id}`
    await createNotifications(
      recipients.map((userId) => ({
        userId,
        type: "task_mention" as const,
        message: `${actorName} mentioned you in "${task.title}"`,
        link: taskLink,
      })),
    )
  }

  return Response.json(
    {
      id: task.id,
      title: task.title,
      description: task.description,
      columnId: task.columnId,
      section: task.section,
      position: task.position,
      assignees: task.assignees,
      createdAt: task.createdAt,
    },
    { status: 201 },
  )
}
