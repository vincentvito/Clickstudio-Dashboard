import assert from "node:assert/strict"
import { test } from "node:test"
import { decryptWebhookSigningSecret, encryptWebhookSigningSecret } from "@/lib/webhooks/secrets"

test("webhook secret encryption refuses plaintext storage when no key material exists", () => {
  const originalWebhookKey = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
  const originalAuthSecret = process.env.AUTH_SECRET
  const originalBetterAuthSecret = process.env.BETTER_AUTH_SECRET

  delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
  delete process.env.AUTH_SECRET
  delete process.env.BETTER_AUTH_SECRET

  try {
    assert.throws(() => encryptWebhookSigningSecret("whsec_test"), /required to encrypt/)
  } finally {
    if (originalWebhookKey) process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = originalWebhookKey
    if (originalAuthSecret) process.env.AUTH_SECRET = originalAuthSecret
    if (originalBetterAuthSecret) process.env.BETTER_AUTH_SECRET = originalBetterAuthSecret
  }
})

test("webhook secrets round-trip through encryption", () => {
  const originalWebhookKey = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
  process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = "test-webhook-encryption-key"

  try {
    const encrypted = encryptWebhookSigningSecret("whsec_test")

    assert.match(encrypted, /^v1:/)
    assert.equal(decryptWebhookSigningSecret(encrypted), "whsec_test")
  } finally {
    if (originalWebhookKey) {
      process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = originalWebhookKey
    } else {
      delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
    }
  }
})
