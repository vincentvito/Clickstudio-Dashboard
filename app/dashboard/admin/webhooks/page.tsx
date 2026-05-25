import prisma from "@/lib/prisma"
import { hasPermission, requireOrg } from "@/lib/api-auth"
import { serializeWebhookEndpoint } from "@/lib/webhooks/endpoint-response"
import { WebhooksClient } from "./webhooks-client"
import {
  POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG,
  POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
  POSTRIDER_SOURCE,
} from "@/lib/webhooks/sources/postrider"

interface PageProps {
  searchParams: Promise<{ event?: string }>
}

function getWebhookBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ?? process.env.WEBHOOK_PUBLIC_BASE_URL

  return (configured || "https://cc.clickstudio.ai").replace(/\/$/, "")
}

function buildWebhookUrl(endpointId: string | null) {
  const path = `${getWebhookBaseUrl()}/api/webhooks/postrider/message-received`
  return endpointId ? `${path}?endpoint=${encodeURIComponent(endpointId)}` : path
}

export default async function AdminWebhooksPage({ searchParams }: PageProps) {
  const org = await requireOrg()
  const params = await searchParams

  if (!org) return null

  if (!hasPermission(org.role, "update")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground text-sm">
          Owner or admin access is required to view webhook endpoints, routing, and event payloads.
        </p>
      </div>
    )
  }

  const [endpoint, routingRules, events] = await Promise.all([
    prisma.webhookEndpoint.findUnique({
      where: {
        organizationId_source_eventSlug: {
          organizationId: org.organizationId,
          source: POSTRIDER_SOURCE,
          eventSlug: POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG,
        },
      },
    }),
    prisma.agentRoutingRule.findMany({
      where: {
        organizationId: org.organizationId,
        source: POSTRIDER_SOURCE,
        eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentEvent.findMany({
      where: {
        organizationId: org.organizationId,
        source: POSTRIDER_SOURCE,
        eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
  ])
  const telegramRule = routingRules.find((rule) => rule.channel === "telegram")

  return (
    <WebhooksClient
      endpoint={endpoint ? serializeWebhookEndpoint(endpoint) : null}
      events={events.map((event) => ({
        id: event.id,
        source: event.source,
        eventType: event.eventType,
        targetAgent: event.targetAgent,
        externalId: event.externalId,
        providerMessageId: event.providerMessageId,
        payload: event.payload,
        status: event.status,
        error: event.error,
        receivedAt: event.receivedAt.toISOString(),
        handledAt: event.handledAt?.toISOString() ?? null,
        deliveries: event.deliveries.map((delivery) => ({
          id: delivery.id,
          channel: delivery.channel,
          target: delivery.target,
          status: delivery.status,
          attempts: delivery.attempts,
          lastError: delivery.lastError,
          deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
          createdAt: delivery.createdAt.toISOString(),
        })),
      }))}
      initialSelectedEventId={params.event}
      webhookUrl={buildWebhookUrl(endpoint?.id ?? null)}
      telegramRule={
        telegramRule
          ? {
              id: telegramRule.id,
              targetAgent: telegramRule.targetAgent,
              target: telegramRule.target,
              isActive: telegramRule.isActive,
            }
          : null
      }
    />
  )
}
