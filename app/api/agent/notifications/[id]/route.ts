import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { resolveAgentContext } from "@/lib/agent-auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) {
    return Response.json(
      { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
      { status: 401 },
    )
  }

  const { id } = await params

  // Scope by `userId` so an agent can only ack notifications addressed to
  // its own synthetic user — even though the agent's tokenId would let it
  // call this route, the resource is fixed to its identity.
  const notif = await prisma.notification.findFirst({
    where: { id, userId: ctx.agentUserId },
  })
  if (!notif) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  })

  return Response.json({
    id: updated.id,
    type: updated.type,
    message: updated.message,
    link: updated.link,
    isRead: updated.isRead,
    createdAt: updated.createdAt,
  })
}
