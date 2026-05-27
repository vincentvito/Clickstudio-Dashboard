import type { AgentContext } from "@/lib/agent-auth"

export const OPEN_AGENT_EVENT_STATUSES = ["open", "pending", "routed"] as const

export function normalizeAgentEventStatus(status: string) {
  if (status === "pending" || status === "routed") return "open"
  if (status === "handled") return "acked"
  return status
}

export function agentEventAccessWhere(ctx: AgentContext) {
  return {
    organizationId: ctx.organizationId,
    OR: [{ targetUserId: ctx.agentUserId }, { targetAgent: ctx.agentName }],
  }
}

function getMessageObject(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    payload.message &&
    typeof payload.message === "object"
  ) {
    return payload.message as Record<string, unknown>
  }

  return null
}

export function getAgentEventSummary(event: {
  source: string
  providerMessageId: string | null
  displayTitle: string | null
  payload: unknown
}) {
  const message = getMessageObject(event.payload)

  return {
    messageId: event.providerMessageId ?? (message?.id as string | undefined) ?? null,
    subject:
      event.displayTitle ?? (typeof message?.subject === "string" ? message.subject : null) ?? null,
    from:
      typeof (message?.from as Record<string, unknown> | undefined)?.email === "string"
        ? ((message?.from as Record<string, unknown>).email as string)
        : null,
    fromName:
      typeof (message?.from as Record<string, unknown> | undefined)?.name === "string"
        ? ((message?.from as Record<string, unknown>).name as string)
        : null,
    receivedAt:
      typeof message?.received_at === "string"
        ? message.received_at
        : null,
  }
}

export function serializeAgentEvent(
  event: {
    id: string
    source: string
    eventType: string
    targetAgent: string | null
    targetUserId: string | null
    externalId: string
    providerMessageId: string | null
    displayTitle: string | null
    payload: unknown
    status: string
    error: string | null
    receivedAt: Date
    handledAt: Date | null
    deliveries: Array<{
      id: string
      channel: string
      target: string | null
      status: string
      attempts: number
      lastError: string | null
      deliveredAt: Date | null
      createdAt: Date
    }>
  },
  opts: { includePayload?: boolean } = {},
) {
  return {
    id: event.id,
    source: event.source,
    eventType: event.eventType,
    targetAgent: event.targetAgent,
    targetUserId: event.targetUserId,
    externalId: event.externalId,
    providerMessageId: event.providerMessageId,
    displayTitle: event.displayTitle,
    summary: getAgentEventSummary(event),
    ...(opts.includePayload ? { payload: event.payload } : {}),
    status: normalizeAgentEventStatus(event.status),
    error: event.error,
    receivedAt: event.receivedAt,
    handledAt: event.handledAt,
    deliveries: event.deliveries,
  }
}
