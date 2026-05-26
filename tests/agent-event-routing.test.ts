import assert from "node:assert/strict"
import { test } from "node:test"
import { getRoutedTargetAgent } from "@/lib/agent-events/routing"

test("agent poll routing determines the assigned agent ahead of Telegram", () => {
  assert.equal(
    getRoutedTargetAgent([
      { channel: "telegram", targetAgent: "Rolino" },
      { channel: "agent_poll", targetAgent: "Rolino-up to date" },
    ]),
    "Rolino-up to date",
  )
})

test("notification-only routing does not assign an agent", () => {
  assert.equal(getRoutedTargetAgent([{ channel: "telegram", targetAgent: "Rolino" }]), null)
})
