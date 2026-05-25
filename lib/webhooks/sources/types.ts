export interface WebhookSourceDisplay {
  providerName: string
  endpointDescription: string
  setupInstruction: string
  verificationInstruction: string
  secretPlaceholder: string
  routingTitle: string
  routingDescription: string
  eventsDescription: string
}

export interface NormalizedWebhookEvent {
  eventType: string
  externalId: string
  providerMessageId?: string | null
  targetAgent?: string | null
  displayTitle: string
  payload: unknown
  status: "pending" | "ignored"
  handledAt?: Date | null
  shouldRoute: boolean
  responseStatus: string
}

export type WebhookParseResult =
  | { success: true; data: NormalizedWebhookEvent }
  | { success: false; reason?: string }

export interface WebhookSourceDefinition {
  source: string
  eventSlug: string
  primaryEventType: string
  signatureHeaders: readonly string[]
  timestampHeaders: readonly string[]
  display: WebhookSourceDisplay
  parseEvent(payload: unknown): WebhookParseResult
  afterRoute?(eventId: string): Promise<void>
}
