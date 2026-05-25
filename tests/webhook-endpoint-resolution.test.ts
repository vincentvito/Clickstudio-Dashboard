import assert from "node:assert/strict"
import { test } from "node:test"
import { findVerifiedWebhookEndpoint } from "@/lib/webhooks/endpoint-resolution"
import { encryptWebhookSigningSecret } from "@/lib/webhooks/secrets"
import { signWebhookPayload } from "@/lib/webhooks/signature"

test("endpoint resolution skips undecryptable secrets and continues scanning", () => {
  const originalWebhookKey = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
  process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = "test-webhook-encryption-key"

  try {
    const timestamp = "1766664000"
    const rawBody = JSON.stringify({ event_id: "evt_abc123" })
    const secret = "whsec_valid"
    const signature = signWebhookPayload({ timestamp, rawBody, secret })
    const validEndpoint = {
      id: "endpoint_valid",
      encryptedSecret: encryptWebhookSigningSecret(secret),
    }

    const result = findVerifiedWebhookEndpoint({
      endpoints: [{ id: "endpoint_broken", encryptedSecret: "not-encrypted" }, validEndpoint],
      signature,
      timestamp,
      endpointId: null,
      rawBody,
    })

    assert.equal(result, validEndpoint)
  } finally {
    if (originalWebhookKey) {
      process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = originalWebhookKey
    } else {
      delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
    }
  }
})
