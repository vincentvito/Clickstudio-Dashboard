interface WebhookEndpointResponseInput {
  id: string
  source: string
  eventSlug: string
  eventType: string
  isActive: boolean
  encryptedSecret: string | null
  lastReceivedAt: Date | string | null
  createdAt: Date | string
}

function toIsoString(value: Date | string | null) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function toRequiredIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value
}

export function serializeWebhookEndpoint(endpoint: WebhookEndpointResponseInput) {
  return {
    id: endpoint.id,
    source: endpoint.source,
    eventSlug: endpoint.eventSlug,
    eventType: endpoint.eventType,
    isActive: endpoint.isActive,
    hasVerificationSecret: Boolean(endpoint.encryptedSecret),
    lastReceivedAt: toIsoString(endpoint.lastReceivedAt),
    createdAt: toRequiredIsoString(endpoint.createdAt),
  }
}
