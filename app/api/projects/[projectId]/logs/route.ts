import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { extractMentionedUserIds } from "@/lib/mentions"
import { createNotifications } from "@/lib/notifications"

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
  const { text } = body

  if (!text?.trim()) {
    return Response.json({ error: "Text is required" }, { status: 400 })
  }

  const trimmed = text.trim()

  const log = await prisma.logEntry.create({
    data: {
      text: trimmed,
      projectId,
    },
  })

  const mentionedIds = extractMentionedUserIds(trimmed).filter((id) => id !== org.user.id)
  if (mentionedIds.length > 0) {
    const validMembers = await prisma.member.findMany({
      where: { organizationId: org.organizationId, userId: { in: mentionedIds } },
      select: { userId: true },
    })
    const authorName = org.user.name || org.user.email
    await createNotifications(
      validMembers.map((m) => ({
        userId: m.userId,
        type: "log_mention",
        message: `${authorName} mentioned you in an update on "${project.title}"`,
        link: `/dashboard/${projectId}?tab=log`,
      })),
    )
  }

  return Response.json(log, { status: 201 })
}
