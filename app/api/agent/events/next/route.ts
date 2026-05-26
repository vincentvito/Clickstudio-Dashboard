import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { resolveAgentContext } from "@/lib/agent-auth"
import {
  agentEventAccessWhere,
  OPEN_AGENT_EVENT_STATUSES,
  serializeAgentEvent,
} from "@/lib/agent-events/api"

function unauthorized() {
  return Response.json(
    { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
    { status: 401 },
  )
}

export async function POST(req: NextRequest) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const body = (await req.json().catch(() => ({}))) as {
    source?: string
    eventType?: string
  }
  const source = body.source ?? url.searchParams.get("source")
  const eventType = body.eventType ?? url.searchParams.get("eventType")

  const claimed = await prisma.$transaction(async (tx) => {
    // TODO(agent-events): add a claim lease/visibility timeout so a poller crash
    // cannot leave an event stuck in processing forever.
    const event = await tx.agentEvent.findFirst({
      where: {
        ...agentEventAccessWhere(ctx),
        status: { in: [...OPEN_AGENT_EVENT_STATUSES] },
        ...(source ? { source } : {}),
        ...(eventType ? { eventType } : {}),
      },
      orderBy: { receivedAt: "asc" },
      select: { id: true },
    })

    if (!event) return null

    const result = await tx.agentEvent.updateMany({
      where: {
        id: event.id,
        status: { in: [...OPEN_AGENT_EVENT_STATUSES] },
      },
      data: {
        status: "processing",
        error: null,
        handledAt: null,
      },
    })

    if (result.count !== 1) return null

    const existingDelivery = await tx.agentEventDelivery.findFirst({
      where: { eventId: event.id, channel: "agent_poll" },
      select: { id: true },
    })

    if (existingDelivery) {
      await tx.agentEventDelivery.update({
        where: { id: existingDelivery.id },
        data: {
          target: ctx.agentName,
          status: "processing",
          lastError: null,
          deliveredAt: null,
        },
      })
    } else {
      await tx.agentEventDelivery.create({
        data: {
          eventId: event.id,
          channel: "agent_poll",
          target: ctx.agentName,
          status: "processing",
        },
      })
    }

    return tx.agentEvent.findUnique({
      where: { id: event.id },
      include: {
        deliveries: {
          orderBy: { createdAt: "asc" },
        },
      },
    })
  })

  if (!claimed) {
    return new Response(null, { status: 204 })
  }

  return Response.json(serializeAgentEvent(claimed, { includePayload: true }))
}
