import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { resolveAgentContext } from "@/lib/agent-auth"

// Listing notifications for the agent's own user is identity-bound and
// doesn't take a scope — every authenticated agent can see what's been
// addressed to it. (Mirrors how `whoami` is also unscoped.)
export async function GET(req: NextRequest) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) {
    return Response.json(
      { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
      { status: 401 },
    )
  }

  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get("unread") === "true"
  const limitParam = url.searchParams.get("limit")
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200)

  const notifications = await prisma.notification.findMany({
    where: {
      userId: ctx.agentUserId,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return Response.json(
    notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
  )
}

// PATCH at the collection root marks-all-read so the CLI doesn't need to
// loop one-at-a-time. Body: { markAllRead: true }.
export async function PATCH(req: NextRequest) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) {
    return Response.json(
      { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
      { status: 401 },
    )
  }

  const body = await req.json().catch(() => ({}))
  if (body.markAllRead !== true) {
    return Response.json(
      { error: "Pass { markAllRead: true } to mark all notifications as read" },
      { status: 400 },
    )
  }

  const result = await prisma.notification.updateMany({
    where: { userId: ctx.agentUserId, isRead: false },
    data: { isRead: true },
  })

  return Response.json({ updated: result.count })
}
