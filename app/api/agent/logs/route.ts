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

export async function POST(req: NextRequest) {
  const ctx = await requireAgent(req, "logs:write")
  if (isAgentResponse(ctx)) return ctx

  const body = await req.json().catch(() => ({}))
  const projectId: string | undefined = body.projectId ?? body.project
  const text: string = (body.text ?? body.message ?? "").trim()

  if (!projectId) {
    return Response.json({ error: "projectId is required" }, { status: 400 })
  }
  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 })
  }
  if (!canAccessProject(ctx, projectId)) {
    return Response.json({ error: "Forbidden", hint: "Project not in token scope" }, { status: 403 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true, title: true },
  })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const log = await prisma.logEntry.create({
    data: { text, projectId },
  })

  // Fire mention notifications the same way the session-auth log endpoint
  // does — without this, CLI-created updates that @-mention teammates
  // would render later but nobody would be notified.
  const mentionedIds = extractMentionedUserIds(text).filter((id) => id !== ctx.agentUserId)
  const recipients = await resolveMentionRecipients(ctx.organizationId, mentionedIds, {
    projectId,
  })
  if (recipients.length > 0) {
    const actorName = `\u{1F916} ${ctx.agentName}`
    await createNotifications(
      recipients.map((userId) => ({
        userId,
        type: "log_mention",
        message: `${actorName} mentioned you in an update on "${project.title}"`,
        link: `/dashboard/${projectId}?tab=log`,
      })),
    )
  }

  return Response.json(
    { id: log.id, text: log.text, projectId: log.projectId, createdAt: log.createdAt },
    { status: 201 },
  )
}
