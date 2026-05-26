import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { resolveAgentContext } from "@/lib/agent-auth"
import { agentEventAccessWhere, serializeAgentEvent } from "@/lib/agent-events/api"

interface RouteContext {
  params: Promise<{ eventId: string }>
}

function unauthorized() {
  return Response.json(
    { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
    { status: 401 },
  )
}

function normalizePatchStatus(status: string | undefined) {
  if (status === "handled") return "acked"
  if (status === "pending" || status === "routed") return "open"
  return status
}

function deliveryStatusForEventStatus(status: string) {
  if (status === "acked") return "delivered"
  if (status === "failed") return "failed"
  if (status === "ignored") return "skipped"
  return "processing"
}

export async function GET(req: NextRequest, context: RouteContext) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) return unauthorized()

  const { eventId } = await context.params
  const event = await prisma.agentEvent.findFirst({
    where: {
      id: eventId,
      ...agentEventAccessWhere(ctx),
    },
    include: {
      deliveries: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!event) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(serializeAgentEvent(event, { includePayload: true }))
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) return unauthorized()

  const { eventId } = await context.params
  const body = (await req.json().catch(() => ({}))) as {
    status?: string
    error?: string | null
  }
  const nextStatus = normalizePatchStatus(body.status)

  if (!nextStatus || !["processing", "acked", "failed", "ignored"].includes(nextStatus)) {
    return Response.json(
      { error: "Pass { status: 'processing' | 'acked' | 'failed' | 'ignored' }" },
      { status: 400 },
    )
  }

  const event = await prisma.agentEvent.findFirst({
    where: {
      id: eventId,
      ...agentEventAccessWhere(ctx),
    },
    select: { id: true },
  })

  if (!event) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const deliveryStatus = deliveryStatusForEventStatus(nextStatus)
  const now = new Date()
  const lastError = nextStatus === "failed" ? body.error?.trim() || "Agent reported failure" : null

  const updated = await prisma.$transaction(async (tx) => {
    const existingDelivery = await tx.agentEventDelivery.findFirst({
      where: { eventId: event.id, channel: "agent_poll" },
      select: { id: true },
    })

    if (existingDelivery) {
      await tx.agentEventDelivery.update({
        where: { id: existingDelivery.id },
        data: {
          status: deliveryStatus,
          attempts: { increment: nextStatus === "processing" ? 0 : 1 },
          lastError,
          deliveredAt: deliveryStatus === "delivered" ? now : null,
        },
      })
    } else {
      await tx.agentEventDelivery.create({
        data: {
          eventId: event.id,
          channel: "agent_poll",
          target: ctx.agentName,
          status: deliveryStatus,
          attempts: nextStatus === "processing" ? 0 : 1,
          lastError,
          deliveredAt: deliveryStatus === "delivered" ? now : null,
        },
      })
    }

    return tx.agentEvent.update({
      where: { id: event.id },
      data: {
        status: nextStatus,
        error: lastError,
        handledAt: ["acked", "ignored"].includes(nextStatus) ? now : null,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "asc" },
        },
      },
    })
  })

  return Response.json(serializeAgentEvent(updated, { includePayload: true }))
}
