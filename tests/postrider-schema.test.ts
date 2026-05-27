import assert from "node:assert/strict"
import { test } from "node:test"
import {
  postriderMessageReceivedSchema,
  postriderWebhookEventSchema,
  POSTRIDER_WEBHOOK_TEST_EVENT_TYPE,
} from "@/lib/webhooks/sources/postrider"

const validPayload = {
  schema_version: "2026-05-01",
  event_type: "message.received",
  event_id: "evt_abc123",
  message: {
    id: "msg_123",
    rfc_message_id: "<abc@example.com>",
    from: {
      email: "noreply@example.com",
      name: "Example",
    },
    detected_type: "verification",
    codes_count: 1,
    links_count: 0,
    received_at: "2026-05-25T12:00:00.000Z",
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
      from: {
        email: "not-an-email",
        name: "Example",
      },
    },
  }

  assert.equal(postriderMessageReceivedSchema.safeParse(invalidPayload).success, false)
})

test("PostRiderAI webhook.test payloads pass union validation", () => {
  const testPayload = {
    schema_version: "2026-05-01",
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
