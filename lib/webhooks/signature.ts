import { createHmac, timingSafeEqual } from "crypto"

const FIVE_MINUTES_MS = 5 * 60 * 1000

function normalizeSignature(signature: string) {
  return signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature
}

export function isWebhookSignatureFormatValid(signature: string) {
  return /^[a-f0-9]{64}$/i.test(normalizeSignature(signature))
}

function parseTimestamp(timestamp: string) {
  if (!/^\d+$/.test(timestamp)) return null

  const value = Number(timestamp)
  if (!Number.isSafeInteger(value)) return null

  return value < 1_000_000_000_000 ? value * 1000 : value
}

export function isWebhookTimestampFresh(timestamp: string, now = Date.now()) {
  const timestampMs = parseTimestamp(timestamp)
  if (!timestampMs) return false

  return Math.abs(now - timestampMs) <= FIVE_MINUTES_MS
}

export function buildWebhookSignedPayload({
  timestamp,
  webhookId,
  rawBody,
}: {
  timestamp: string
  webhookId?: string | null
  rawBody: string
}) {
  return webhookId ? `${timestamp}.${webhookId}.${rawBody}` : `${timestamp}.${rawBody}`
}

export function signWebhookPayload({
  timestamp,
  webhookId,
  rawBody,
  secret,
}: {
  timestamp: string
  webhookId?: string | null
  rawBody: string
  secret: string
}) {
  return createHmac("sha256", secret)
    .update(buildWebhookSignedPayload({ timestamp, webhookId, rawBody }))
    .digest("hex")
}

export function verifyWebhookSignature({
  signature,
  timestamp,
  webhookId,
  rawBody,
  secret,
}: {
  signature: string
  timestamp: string
  webhookId?: string | null
  rawBody: string
  secret: string
}) {
  const expected = signWebhookPayload({ timestamp, webhookId, rawBody, secret })
  const actual = normalizeSignature(signature)

  if (!isWebhookSignatureFormatValid(signature)) return false

  const expectedBuffer = Buffer.from(expected, "hex")
  const actualBuffer = Buffer.from(actual, "hex")

  return (
    expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
  )
}
