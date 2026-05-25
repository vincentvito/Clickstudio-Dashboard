import assert from "node:assert/strict"
import { test } from "node:test"
import { formatTelegramAgentEventMessage } from "@/lib/agent-events/deliveries/telegram"

test("Telegram delivery summarizes sensitive codes without exposing them", () => {
  const text = formatTelegramAgentEventMessage({
    id: "delivery_123",
    target: "12345",
    event: {
      id: "event_123",
      targetAgent: "Rolino",
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
  })

  assert.match(text, /Codes detected: 1/)
  assert.match(text, /Links detected: 0/)
  assert.doesNotMatch(text, /123456/)
})
