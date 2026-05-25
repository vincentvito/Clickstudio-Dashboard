import { after, type NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  routeAgentEvent,
  notifyPostriderMessageReceived,
} from "@/lib/agent-events/route-agent-event"
import { findVerifiedWebhookEndpoint } from "@/lib/webhooks/endpoint-resolution"
import { isWebhookSignatureFormatValid, isWebhookTimestampFresh } from "@/lib/webhooks/signature"
import {
  getPostriderTargetAgent,
  parsePostriderMessageReceived,
  POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG,
  POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
  POSTRIDER_SOURCE,
} from "@/lib/webhooks/sources/postrider"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ source: string; event: string }>
}

function unauthorized(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 })
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"
}

function parseJson(rawBody: string) {
  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    return null
  }
}

async function resolveVerifiedEndpoint({
  source,
  event,
  signature,
  timestamp,
  endpointId,
  rawBody,
}: {
  source: string
  event: string
  signature: string
  timestamp: string
  endpointId: string | null
  rawBody: string
}) {
  const endpoints = endpointId
    ? await prisma.webhookEndpoint.findMany({
        where: {
          id: endpointId,
          source,
          eventSlug: event,
        },
      })
    : await prisma.webhookEndpoint.findMany({
        where: {
          source,
          eventSlug: event,
          isActive: true,
        },
      })

  if (endpoints.length === 0) {
    return {
      endpoint: null,
      error: Response.json({ error: "Unknown webhook endpoint" }, { status: 404 }),
    }
  }

  const inactiveEndpoint = endpoints.find((endpoint) => !endpoint.isActive)
  if (inactiveEndpoint) {
    return {
      endpoint: null,
      error: Response.json({ error: "Webhook endpoint is inactive" }, { status: 403 }),
    }
  }

  const endpoint = findVerifiedWebhookEndpoint({
    endpoints,
    signature,
    timestamp,
    endpointId,
    rawBody,
  })
  if (endpoint) return { endpoint, error: null }

  return { endpoint: null, error: unauthorized("Invalid webhook signature") }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { source, event } = await context.params
  const rawBody = await req.text()

  if (source !== POSTRIDER_SOURCE || event !== POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG) {
    return Response.json({ error: "Unknown webhook source or event" }, { status: 404 })
  }

  const signature = req.headers.get("x-webhook-signature")
  const timestamp = req.headers.get("x-webhook-timestamp")
  const endpointId =
    req.headers.get("x-webhook-endpoint-id") ?? req.headers.get("x-controlcenter-endpoint-id")

  if (!signature || !timestamp) {
    return unauthorized("Missing webhook signature headers")
  }

  if (!isWebhookSignatureFormatValid(signature)) {
    return unauthorized("Invalid webhook signature")
  }

  if (!isWebhookTimestampFresh(timestamp)) {
    return unauthorized("Stale webhook timestamp")
  }

  const endpointResult = await resolveVerifiedEndpoint({
    source,
    event,
    signature,
    timestamp,
    endpointId,
    rawBody,
  })
  if (endpointResult.error) return endpointResult.error

  const endpoint = endpointResult.endpoint
  if (!endpoint) return unauthorized("Invalid webhook signature")

  const parsedJson = parseJson(rawBody)
  if (!parsedJson) {
    return badRequest("Invalid JSON payload")
  }

  const parsedPayload = parsePostriderMessageReceived(parsedJson)
  if (!parsedPayload.success) {
    return badRequest("Invalid PostRiderAI message.received payload")
  }

  const payload = parsedPayload.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.agentEvent.findUnique({
        where: {
          organizationId_source_eventType_externalId: {
            organizationId: endpoint.organizationId,
            source: POSTRIDER_SOURCE,
            eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
            externalId: payload.event_id,
          },
        },
      })

      if (existingEvent) {
        await tx.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: { lastReceivedAt: new Date() },
        })
        return { eventId: existingEvent.id, duplicate: true }
      }

      const routingRules = await tx.agentRoutingRule.findMany({
        where: {
          organizationId: endpoint.organizationId,
          source: POSTRIDER_SOURCE,
          eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
          isActive: true,
        },
        orderBy: { createdAt: "asc" },
      })

      const targetAgent =
        routingRules.find((rule) => rule.targetAgent)?.targetAgent ??
        getPostriderTargetAgent(payload)

      const agentEvent = await tx.agentEvent.create({
        data: {
          organizationId: endpoint.organizationId,
          source: POSTRIDER_SOURCE,
          eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
          targetAgent,
          externalId: payload.event_id,
          providerMessageId: payload.message.message_id,
          payload,
          status: "pending",
        },
      })

      if (routingRules.length > 0) {
        await tx.agentEventDelivery.createMany({
          data: routingRules.map((rule) => ({
            eventId: agentEvent.id,
            channel: rule.channel,
            target: rule.target,
            status: "pending",
          })),
        })
      }

      await tx.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { lastReceivedAt: new Date() },
      })

      return { eventId: agentEvent.id, duplicate: false }
    })

    if (result.duplicate) {
      return Response.json({ ok: true, eventId: result.eventId, status: "duplicate" })
    }

    after(() =>
      Promise.allSettled([
        routeAgentEvent(result.eventId),
        notifyPostriderMessageReceived(result.eventId),
      ]),
    )

    return Response.json({ ok: true, eventId: result.eventId, status: "pending" })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingEvent = await prisma.agentEvent.findUnique({
        where: {
          organizationId_source_eventType_externalId: {
            organizationId: endpoint.organizationId,
            source: POSTRIDER_SOURCE,
            eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
            externalId: payload.event_id,
          },
        },
      })

      if (existingEvent) {
        return Response.json({ ok: true, eventId: existingEvent.id, status: "duplicate" })
      }
    }

    throw error
  }
}
