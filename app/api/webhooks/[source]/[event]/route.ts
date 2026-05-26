import { after, type NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { routeAgentEvent } from "@/lib/agent-events/route-agent-event"
import { getRoutedTargetAgent } from "@/lib/agent-events/routing"
import { findVerifiedWebhookEndpoint } from "@/lib/webhooks/endpoint-resolution"
import { isWebhookSignatureFormatValid, isWebhookTimestampFresh } from "@/lib/webhooks/signature"
import { getWebhookSourceDefinition } from "@/lib/webhooks/sources"

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

function getFirstHeader(req: NextRequest, names: readonly string[]) {
  for (const name of names) {
    const value = req.headers.get(name)
    if (value) return value
  }
  return null
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
          encryptedSecret: { not: null },
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

  if (endpointId && !endpoints[0]?.encryptedSecret) {
    return {
      endpoint: null,
      error: Response.json(
        { error: "Webhook verification secret is not configured" },
        { status: 400 },
      ),
    }
  }

  const endpoint = findVerifiedWebhookEndpoint({
    endpoints,
    signature,
    timestamp,
    rawBody,
  })
  if (endpoint) return { endpoint, error: null }

  return { endpoint: null, error: unauthorized("Invalid webhook signature") }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { source, event } = await context.params
  const rawBody = await req.text()
  const sourceDefinition = getWebhookSourceDefinition(source, event)

  if (!sourceDefinition) {
    return Response.json({ error: "Unknown webhook source or event" }, { status: 404 })
  }

  const signature = getFirstHeader(req, sourceDefinition.signatureHeaders)
  const timestamp = getFirstHeader(req, sourceDefinition.timestampHeaders)
  const endpointId =
    req.nextUrl.searchParams.get("endpoint") ??
    req.headers.get("x-webhook-endpoint-id") ??
    req.headers.get("x-controlcenter-endpoint-id")

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
    source: sourceDefinition.source,
    event: sourceDefinition.eventSlug,
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

  const parsedEvent = sourceDefinition.parseEvent(parsedJson)
  if (!parsedEvent.success) {
    return badRequest(
      parsedEvent.reason
        ? `Invalid ${sourceDefinition.display.providerName} webhook payload: ${parsedEvent.reason}`
        : `Invalid ${sourceDefinition.display.providerName} webhook payload`,
    )
  }

  const normalizedEvent = parsedEvent.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.agentEvent.findUnique({
        where: {
          organizationId_source_eventType_externalId: {
            organizationId: endpoint.organizationId,
            source: sourceDefinition.source,
            eventType: normalizedEvent.eventType,
            externalId: normalizedEvent.externalId,
          },
        },
      })

      if (existingEvent) {
        if (!normalizedEvent.shouldRoute) {
          await tx.agentEvent.update({
            where: { id: existingEvent.id },
            data: {
              displayTitle: normalizedEvent.displayTitle,
              payload: normalizedEvent.payload as never,
              status: normalizedEvent.status,
              handledAt: normalizedEvent.handledAt ?? new Date(),
            },
          })
        }

        await tx.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: { lastReceivedAt: new Date() },
        })
        return { eventId: existingEvent.id, duplicate: true }
      }

      const routingRules = normalizedEvent.shouldRoute
        ? await tx.agentRoutingRule.findMany({
            where: {
              organizationId: endpoint.organizationId,
              source: sourceDefinition.source,
              eventType: normalizedEvent.eventType,
              isActive: true,
            },
            orderBy: { createdAt: "asc" },
          })
        : []

      const agentEvent = await tx.agentEvent.create({
        data: {
          organizationId: endpoint.organizationId,
          source: sourceDefinition.source,
          eventType: normalizedEvent.eventType,
          targetAgent: getRoutedTargetAgent(routingRules) ?? normalizedEvent.targetAgent ?? null,
          externalId: normalizedEvent.externalId,
          providerMessageId: normalizedEvent.providerMessageId ?? null,
          displayTitle: normalizedEvent.displayTitle,
          payload: normalizedEvent.payload as never,
          status: normalizedEvent.status,
          handledAt: normalizedEvent.handledAt ?? null,
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

    if (result.duplicate && normalizedEvent.shouldRoute) {
      return Response.json({ ok: true, eventId: result.eventId, status: "duplicate" })
    }

    if (normalizedEvent.shouldRoute) {
      after(() =>
        Promise.allSettled([
          routeAgentEvent(result.eventId),
          ...(sourceDefinition.afterRoute ? [sourceDefinition.afterRoute(result.eventId)] : []),
        ]),
      )
    }

    return Response.json({
      ok: true,
      eventId: result.eventId,
      status: normalizedEvent.responseStatus,
      eventType: normalizedEvent.eventType,
      externalId: normalizedEvent.externalId,
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingEvent = await prisma.agentEvent.findUnique({
        where: {
          organizationId_source_eventType_externalId: {
            organizationId: endpoint.organizationId,
            source: sourceDefinition.source,
            eventType: normalizedEvent.eventType,
            externalId: normalizedEvent.externalId,
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
