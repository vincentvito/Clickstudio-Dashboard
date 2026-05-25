import { decryptWebhookSigningSecret } from "@/lib/webhooks/secrets"
import { verifyWebhookSignature } from "@/lib/webhooks/signature"

interface WebhookEndpointCandidate {
  encryptedSecret: string | null
}

export function findVerifiedWebhookEndpoint<T extends WebhookEndpointCandidate>({
  endpoints,
  signature,
  timestamp,
  rawBody,
}: {
  endpoints: T[]
  signature: string
  timestamp: string
  rawBody: string
}) {
  for (const endpoint of endpoints) {
    if (!endpoint.encryptedSecret) continue

    let signingSecret: string
    try {
      signingSecret = decryptWebhookSigningSecret(endpoint.encryptedSecret)
    } catch {
      continue
    }

    const matchesCanonicalSignature = verifyWebhookSignature({
      signature,
      timestamp,
      rawBody,
      secret: signingSecret,
    })

    if (matchesCanonicalSignature) {
      return endpoint
    }
  }

  return null
}
