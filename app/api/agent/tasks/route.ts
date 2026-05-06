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
import {
  detectUnknownFields,
  unknownFieldWarnings,
  fieldError,
} from "@/lib/agent-fields"

const ASSIGNEE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  isAgent: true,
} as const

// Keep in sync with the body parsing below. Aliases (status→columnId,
// project→projectId) are listed as their incoming names.
const TASK_CREATE_FIELDS = [
  "projectId",
  "project",
  "title",
  "description",
  "columnId",
  "status",
  "section",
  "assignToSelf",
  "assigneeIds",
] as const


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
  const unknownFields = detectUnknownFields(body, TASK_CREATE_FIELDS)
  const projectId: string | undefined = body.projectId ?? body.project
  const title: string = (body.title ?? "").trim()

  if (!projectId) {
    return fieldError("projectId", "projectId is required", "Pass --project <ref> on the CLI")
  }
  if (!title) {
    return fieldError("title", "title is required")
  }
  if (!canAccessProject(ctx, projectId)) {
    return Response.json(
      { error: "Forbidden", hint: "Project not in token scope" },
      { status: 403 },
    )
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!project) {
    return fieldError("projectId", "Project not found", undefined, 404)
  }

  const description: string = typeof body.description === "string" ? body.description : ""
  const columnId: string = body.columnId ?? body.status ?? "todo"
  const section: string = body.section ?? "Product"

  // Assignee resolution rules:
  //   - If `assigneeIds` is provided, validate it via resolveMentionRecipients
  //     (drops anyone not in the org / not active). Default `assignToSelf` to
  //     false in that case so the agent can hand a task off to a human without
  //     auto-claiming a slot. Caller can still pass `assignToSelf: true` to
  //     keep itself in the union.
  //   - If `assigneeIds` is omitted, fall back to the legacy default of
  //     auto-assigning the agent (matches what early CLI users expect).
  const rawAssigneeIds: unknown = body.assigneeIds
  const hasExplicitAssignees =
    Array.isArray(rawAssigneeIds) && rawAssigneeIds.every((v) => typeof v === "string")
  const explicitAssignToSelf =
    typeof body.assignToSelf === "boolean" ? body.assignToSelf : null
  const assignToSelf = explicitAssignToSelf ?? !hasExplicitAssignees

  const validatedAssigneeIds = hasExplicitAssignees
    ? await resolveMentionRecipients(ctx.organizationId, rawAssigneeIds as string[], {
        projectId,
      })
    : []

  const finalAssigneeSet = new Set<string>(validatedAssigneeIds)
  if (assignToSelf) finalAssigneeSet.add(ctx.agentUserId)

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
        ...(finalAssigneeSet.size > 0 && {
          assignees: {
            connect: Array.from(finalAssigneeSet).map((id) => ({ id })),
          },
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

  // Notifications: assignees (other than the actor) get `task_assigned`,
  // anyone @-mentioned in the description who isn't already being assigned
  // gets `task_mention` instead — same dedupe shape as the session-auth
  // POST /api/projects/[projectId]/tasks route.
  const actorName = `\u{1F916} ${ctx.agentName}`
  const taskLink = `/dashboard/${projectId}?tab=tasks&task=${task.id}`

  const newlyAssigned = Array.from(finalAssigneeSet).filter((id) => id !== ctx.agentUserId)

  const mentionedIds = extractMentionedUserIds(description).filter(
    (id) => id !== ctx.agentUserId && !newlyAssigned.includes(id),
  )
  const mentionRecipients = mentionedIds.length
    ? await resolveMentionRecipients(ctx.organizationId, mentionedIds, { projectId })
    : []

  if (newlyAssigned.length > 0 || mentionRecipients.length > 0) {
    await createNotifications([
      ...newlyAssigned.map((userId) => ({
        userId,
        type: "task_assigned" as const,
        message: `${actorName} assigned you to "${task.title}"`,
        link: taskLink,
      })),
      ...mentionRecipients.map((userId) => ({
        userId,
        type: "task_mention" as const,
        message: `${actorName} mentioned you in "${task.title}"`,
        link: taskLink,
      })),
    ])
  }

  const warnings = unknownFieldWarnings(unknownFields)

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
      ...(warnings.length > 0 && { warnings }),
    },
    { status: 201 },
  )
}
