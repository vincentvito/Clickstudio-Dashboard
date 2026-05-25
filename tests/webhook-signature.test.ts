import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isWebhookSignatureFormatValid,
  isWebhookTimestampFresh,
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/webhooks/signature"

test("valid webhook signatures verify with timestamp, webhook id, and raw body", () => {
  const timestamp = "1766664000"
  const webhookId = "wh_123"
  const rawBody = JSON.stringify({ event_id: "evt_abc123" })
  const secret = "whsec_test"
  const signature = signWebhookPayload({ timestamp, webhookId, rawBody, secret })

  assert.equal(verifyWebhookSignature({ signature, timestamp, webhookId, rawBody, secret }), true)
})

test("valid PostRiderAI signatures verify with timestamp and raw body", () => {
  const timestamp = "1766664000"
  const rawBody = JSON.stringify({ event_id: "evt_abc123" })
  const secret = "whsec_test"
  const signature = signWebhookPayload({ timestamp, rawBody, secret })

  assert.equal(verifyWebhookSignature({ signature, timestamp, rawBody, secret }), true)
})

test("bad webhook signatures are rejected", () => {
  assert.equal(
    verifyWebhookSignature({
      signature: "sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      timestamp: "1766664000",
      webhookId: "wh_123",
      rawBody: "{}",
      secret: "whsec_test",
    }),
    false,
  )
})

test("malformed webhook signatures can be rejected before secret lookup", () => {
  assert.equal(isWebhookSignatureFormatValid("not-a-signature"), false)
  assert.equal(isWebhookSignatureFormatValid("sha256=not-a-signature"), false)
  assert.equal(
    isWebhookSignatureFormatValid(
      "sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ),
    true,
  )
})

test("stale webhook timestamps are rejected", () => {
  const now = Date.parse("2026-05-25T12:00:00.000Z")

  assert.equal(isWebhookTimestampFresh(String(Math.floor(now / 1000)), now), true)
  assert.equal(isWebhookTimestampFresh(String(Math.floor((now - 301_000) / 1000)), now), false)
})
