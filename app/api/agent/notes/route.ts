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

const AUTHOR_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  isAgent: true,
} as const

const NOTE_CREATE_FIELDS = [
  "projectId",
  "project",
  "title",
  "content",
] as const

export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "notes:read")
  if (isAgentResponse(ctx)) return ctx

  const url = new URL(req.url)
  const projectId = url.searchParams.get("project") ?? url.searchParams.get("projectId")

  if (!projectId) {
    return fieldError("projectId", "?project=<id> is required")
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

  const notes = await prisma.note.findMany({
    where: { projectId },
    include: { author: { select: AUTHOR_SELECT } },
    orderBy: { updatedAt: "desc" },
  })

  return Response.json(
    notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      projectId: n.projectId,
      author: n.author,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireAgent(req, "notes:write")
  if (isAgentResponse(ctx)) return ctx

  const body = await req.json().catch(() => ({}))
  const unknownFields = detectUnknownFields(body, NOTE_CREATE_FIELDS)
  const projectId: string | undefined = body.projectId ?? body.project
  const title: string = (body.title ?? "").trim() || "Untitled"
  const content: string = typeof body.content === "string" ? body.content : ""

  if (!projectId) {
    return fieldError("projectId", "projectId is required", "Pass --project <ref> on the CLI")
  }
  if (!canAccessProject(ctx, projectId)) {
    return Response.json(
      { error: "Forbidden", hint: "Project not in token scope" },
      { status: 403 },
    )
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true, title: true },
  })
  if (!project) {
    return fieldError("projectId", "Project not found", undefined, 404)
  }

  const note = await prisma.note.create({
    data: {
      title,
      content,
      projectId,
      authorId: ctx.agentUserId,
    },
    include: { author: { select: AUTHOR_SELECT } },
  })

  // Mention notifications, mirroring the session-auth note POST. An agent
  // that drops a note with @[Name](id) markup gets the same reach as a human.
  const mentionedIds = extractMentionedUserIds(content).filter(
    (id) => id !== ctx.agentUserId,
  )
  const recipients = await resolveMentionRecipients(ctx.organizationId, mentionedIds, {
    projectId,
  })
  if (recipients.length > 0) {
    const actorName = `\u{1F916} ${ctx.agentName}`
    await createNotifications(
      recipients.map((userId) => ({
        userId,
        type: "note_mention" as const,
        message: `${actorName} mentioned you in "${note.title}"`,
        link: `/dashboard/${projectId}?tab=notes&note=${note.id}`,
      })),
    )
  }

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json(
    {
      id: note.id,
      title: note.title,
      content: note.content,
      projectId: note.projectId,
      author: note.author,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      ...(warnings.length > 0 && { warnings }),
    },
    { status: 201 },
  )
}
