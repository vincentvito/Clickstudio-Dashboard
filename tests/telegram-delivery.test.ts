import assert from "node:assert/strict"
import { test } from "node:test"
import { formatTelegramAgentEventMessage } from "@/lib/agent-events/deliveries/telegram"

function createDelivery(targetAgent: string | null = "Rolino") {
  return {
    id: "delivery_123",
    target: "12345",
    event: {
      id: "event_123",
      targetAgent,
      externalId: "evt_abc123",
      providerMessageId: "msg_123",
      payload: {
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
      },
    },
  }
}

test("Telegram delivery mentions the configured agent with fetch action and no sensitive codes", () => {
  const text = formatTelegramAgentEventMessage({
    ...createDelivery("Rolino"),
  })

  assert.match(text, /@RolinoBot New PostRiderAI message for Rolino/)
  assert.match(text, /Message ID: msg_123/)
  assert.match(text, /Subject: Your code/)
  assert.match(text, /From: Example <noreply@example.com>/)
  assert.match(text, /Action: Fetch and process this email\./)
  assert.doesNotMatch(text, /123456/)
})

test("Telegram delivery uses the configured non-Rolino agent name", () => {
  const text = formatTelegramAgentEventMessage({
    ...createDelivery("Hermes"),
  })

  assert.match(text, /@HermesBot New PostRiderAI message for Hermes/)
  assert.doesNotMatch(text, /Rolino/)
})
