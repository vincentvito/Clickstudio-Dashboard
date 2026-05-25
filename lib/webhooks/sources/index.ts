import { notifyPostriderMessageReceived } from "@/lib/agent-events/route-agent-event"
import { postriderWebhookSource } from "@/lib/webhooks/sources/postrider"
import type { WebhookSourceDefinition } from "@/lib/webhooks/sources/types"

export const DEFAULT_WEBHOOK_SOURCE: WebhookSourceDefinition = {
  ...postriderWebhookSource,
  // Keep source parsing/display free of delivery side effects. The notification
  // helper imports the PostRider schema, so wiring it here avoids a cycle.
  afterRoute: notifyPostriderMessageReceived,
}

export const WEBHOOK_SOURCES: WebhookSourceDefinition[] = [DEFAULT_WEBHOOK_SOURCE]

export function getWebhookSourceDefinition(source: string, eventSlug: string) {
  return WEBHOOK_SOURCES.find(
    (definition) => definition.source === source && definition.eventSlug === eventSlug,
  )
}

export function getDefaultWebhookSourceDefinition() {
  return DEFAULT_WEBHOOK_SOURCE
}
