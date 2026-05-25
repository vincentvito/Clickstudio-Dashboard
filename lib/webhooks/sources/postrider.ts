import { z } from "zod"

export const POSTRIDER_SOURCE = "postrider"
export const POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG = "message-received"
export const POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE = "message.received"
export const POSTRIDER_WEBHOOK_TEST_EVENT_TYPE = "webhook.test"

const postriderInboxSchema = z.object({
  id: z.string(),
  address: z.string().email(),
  name: z.string(),
})

export const postriderMessageReceivedSchema = z.object({
  type: z.literal("event"),
  event_type: z.literal(POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE),
  event_id: z.string(),
  message: z.object({
    inbox_id: z.string(),
    message_id: z.string(),
    timestamp: z.string().datetime(),
    from: z.string().email(),
    from_name: z.string().nullable().optional(),
    to: z.array(z.string().email()),
    subject: z.string().nullable(),
    detected_type: z.string().nullable().optional(),
    codes: z.array(z.string()),
    links: z.array(
      z.object({
        label: z.string().nullable().optional(),
        url: z.string().url(),
      }),
    ),
  }),
  inbox: postriderInboxSchema,
})

export const postriderWebhookTestSchema = z.object({
  type: z.literal("event"),
  event_type: z.literal(POSTRIDER_WEBHOOK_TEST_EVENT_TYPE),
  event_id: z.string(),
  inbox: postriderInboxSchema,
  test: z.literal(true),
})

export const postriderWebhookEventSchema = z.discriminatedUnion("event_type", [
  postriderMessageReceivedSchema,
  postriderWebhookTestSchema,
])

export type PostriderMessageReceivedPayload = z.infer<typeof postriderMessageReceivedSchema>
export type PostriderWebhookEventPayload = z.infer<typeof postriderWebhookEventSchema>

export function getPostriderTargetAgent(payload: PostriderMessageReceivedPayload) {
  return payload.inbox.name || payload.inbox.address
}

export function parsePostriderMessageReceived(payload: unknown) {
  return postriderMessageReceivedSchema.safeParse(payload)
}

export function parsePostriderWebhookEvent(payload: unknown) {
  return postriderWebhookEventSchema.safeParse(payload)
}
