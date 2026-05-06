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
import { detectUnknownFields, unknownFieldWarnings } from "@/lib/agent-fields"

const AUTHOR_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  isAgent: true,
} as const

const NOTE_UPDATE_FIELDS = ["title", "content"] as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const ctx = await requireAgent(req, "notes:read")
  if (isAgentResponse(ctx)) return ctx

  const { noteId } = await params

  const note = await prisma.note.findFirst({
    where: { id: noteId, project: { organizationId: ctx.organizationId } },
    include: { author: { select: AUTHOR_SELECT } },
  })

  if (!note || !canAccessProject(ctx, note.projectId)) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({
    id: note.id,
    title: note.title,
    content: note.content,
    projectId: note.projectId,
    author: note.author,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const ctx = await requireAgent(req, "notes:write")
  if (isAgentResponse(ctx)) return ctx

  const { noteId } = await params

  const note = await prisma.note.findFirst({
    where: { id: noteId, project: { organizationId: ctx.organizationId } },
  })

  if (!note || !canAccessProject(ctx, note.projectId)) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const unknownFields = detectUnknownFields(body, NOTE_UPDATE_FIELDS)

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
    },
    include: { author: { select: AUTHOR_SELECT } },
  })

  // Newly-mentioned recipients get a note_mention notification — mirrors the
  // session-auth PATCH route. Skip the actor's own ID so agents don't notify
  // themselves when they edit their own note.
  if (body.content !== undefined && body.content !== note.content) {
    const newMentionIds = diffMentions(note.content, body.content).filter(
      (id) => id !== ctx.agentUserId,
    )
    const recipients = await resolveMentionRecipients(ctx.organizationId, newMentionIds, {
      projectId: note.projectId,
    })
    if (recipients.length > 0) {
      const actorName = `\u{1F916} ${ctx.agentName}`
      await createNotifications(
        recipients.map((userId) => ({
          userId,
          type: "note_mention" as const,
          message: `${actorName} mentioned you in "${updated.title}"`,
          link: `/dashboard/${updated.projectId}?tab=notes&note=${updated.id}`,
        })),
      )
    }
  }

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json({
    id: updated.id,
    title: updated.title,
    content: updated.content,
    projectId: updated.projectId,
    author: updated.author,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    ...(warnings.length > 0 && { warnings }),
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const ctx = await requireAgent(req, "notes:write")
  if (isAgentResponse(ctx)) return ctx

  const { noteId } = await params

  const note = await prisma.note.findFirst({
    where: { id: noteId, project: { organizationId: ctx.organizationId } },
    select: { id: true, projectId: true, title: true },
  })

  if (!note || !canAccessProject(ctx, note.projectId)) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.note.delete({ where: { id: noteId } })

  return Response.json({ ok: true, id: note.id, title: note.title })
}
