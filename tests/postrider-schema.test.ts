import assert from "node:assert/strict"
import { test } from "node:test"
import {
  postriderMessageReceivedSchema,
  postriderWebhookEventSchema,
  POSTRIDER_WEBHOOK_TEST_EVENT_TYPE,
} from "@/lib/webhooks/sources/postrider"

const validPayload = {
  type: "event",
  event_type: "message.received",
  event_id: "evt_abc123",
  message: {
    inbox_id: "inbox_123",
    message_id: "msg_123",
    timestamp: "2026-05-25T12:00:00.000Z",
    from: "noreply@example.com",
    from_name: "Example",
    to: ["agent@postriderai.com"],
    subject: "Your code",
    detected_type: "verification",
    codes: ["123456"],
    links: [],
  },
  inbox: {
    id: "inbox_123",
    address: "agent@postriderai.com",
    name: "GitHub agent",
  },
}

test("valid PostRiderAI message.received payloads pass zod validation", () => {
  assert.equal(postriderMessageReceivedSchema.safeParse(validPayload).success, true)
  assert.equal(postriderWebhookEventSchema.safeParse(validPayload).success, true)
})

test("invalid PostRiderAI payloads fail before storage or routing", () => {
  const invalidPayload = {
    ...validPayload,
    message: {
      ...validPayload.message,
      from: "not-an-email",
    },
  }

  assert.equal(postriderMessageReceivedSchema.safeParse(invalidPayload).success, false)
})

test("PostRiderAI webhook.test payloads pass union validation", () => {
  const testPayload = {
    type: "event",
    event_type: POSTRIDER_WEBHOOK_TEST_EVENT_TYPE,
    event_id: "evt_test_abc123",
    inbox: {
      id: "inbox_123",
      address: "agent@postriderai.com",
      name: "GitHub agent",
    },
    test: true,
  }

  assert.equal(postriderWebhookEventSchema.safeParse(testPayload).success, true)
  assert.equal(postriderMessageReceivedSchema.safeParse(testPayload).success, false)
})
