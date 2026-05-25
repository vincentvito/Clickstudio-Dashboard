import prisma from "@/lib/prisma"
import { hasPermission, requireOrg } from "@/lib/api-auth"
import { serializeWebhookEndpoint } from "@/lib/webhooks/endpoint-response"
import { getDefaultWebhookSourceDefinition } from "@/lib/webhooks/sources"
import { WebhooksClient } from "./webhooks-client"

interface PageProps {
  searchParams: Promise<{ event?: string }>
}

function getWebhookBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ?? process.env.WEBHOOK_PUBLIC_BASE_URL

  return (configured || "https://cc.clickstudio.ai").replace(/\/$/, "")
}

function buildWebhookUrl({
  source,
  eventSlug,
  endpointId,
}: {
  source: string
  eventSlug: string
  endpointId: string | null
}) {
  const path = `${getWebhookBaseUrl()}/api/webhooks/${source}/${eventSlug}`
  return endpointId ? `${path}?endpoint=${encodeURIComponent(endpointId)}` : path
}

export default async function AdminWebhooksPage({ searchParams }: PageProps) {
  const org = await requireOrg()
  const params = await searchParams

  if (!org) return null
  const sourceDefinition = getDefaultWebhookSourceDefinition()

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
          source: sourceDefinition.source,
          eventSlug: sourceDefinition.eventSlug,
        },
      },
    }),
    prisma.agentRoutingRule.findMany({
      where: {
        organizationId: org.organizationId,
        source: sourceDefinition.source,
        eventType: sourceDefinition.primaryEventType,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentEvent.findMany({
      where: {
        organizationId: org.organizationId,
        source: sourceDefinition.source,
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
        displayTitle: event.displayTitle,
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
      sourceDisplay={sourceDefinition.display}
      webhookUrl={buildWebhookUrl({
        source: sourceDefinition.source,
        eventSlug: sourceDefinition.eventSlug,
        endpointId: endpoint?.id ?? null,
      })}
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
