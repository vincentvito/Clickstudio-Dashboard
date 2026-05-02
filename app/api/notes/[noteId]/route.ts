import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { diffMentions } from "@/lib/mentions"
import { createNotifications } from "@/lib/notifications"
import { resolveMentionRecipients } from "@/lib/mention-recipients"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { noteId } = await params

  const note = await prisma.note.findFirst({
    where: { id: noteId, project: { organizationId: org.organizationId } },
  })

  if (!note) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
    },
  })

  // Notify newly mentioned members
  if (body.content !== undefined && body.content !== note.content) {
    const newMentionIds = diffMentions(note.content, body.content).filter(
      (id) => id !== org.user.id,
    )
    const recipients = await resolveMentionRecipients(org.organizationId, newMentionIds, {
      projectId: note.projectId,
    })
    if (recipients.length > 0) {
      const authorName = org.user.name || org.user.email
      await createNotifications(
        recipients.map((userId) => ({
          userId,
          type: "note_mention",
          message: `${authorName} mentioned you in "${updated.title}"`,
          link: `/dashboard/${updated.projectId}?tab=notes&note=${updated.id}`,
        })),
      )
    }
  }

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { noteId } = await params

  const note = await prisma.note.findFirst({
    where: { id: noteId, project: { organizationId: org.organizationId } },
  })

  if (!note) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.note.delete({ where: { id: noteId } })

  return Response.json({ ok: true })
}
