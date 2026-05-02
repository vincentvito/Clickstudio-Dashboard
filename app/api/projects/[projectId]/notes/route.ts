import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { extractMentionedUserIds } from "@/lib/mentions"
import { createNotifications } from "@/lib/notifications"
import { resolveMentionRecipients } from "@/lib/mention-recipients"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.organizationId },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const notes = await prisma.note.findMany({
    where: { projectId },
    include: {
      author: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return Response.json(notes)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.organizationId },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const content = body.content ?? ""

  const note = await prisma.note.create({
    data: {
      title: body.title?.trim() || "Untitled",
      content,
      projectId,
      authorId: org.user.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
    },
  })

  // Notify mentioned recipients (members or active agents in the same org)
  const mentionedIds = extractMentionedUserIds(content).filter((id) => id !== org.user.id)
  const recipients = await resolveMentionRecipients(org.organizationId, mentionedIds, {
    projectId,
  })
  if (recipients.length > 0) {
    const authorName = org.user.name || org.user.email
    await createNotifications(
      recipients.map((userId) => ({
        userId,
        type: "note_mention",
        message: `${authorName} mentioned you in "${note.title}"`,
        link: `/dashboard/${projectId}?tab=notes&note=${note.id}`,
      })),
    )
  }

  return Response.json(note, { status: 201 })
}
