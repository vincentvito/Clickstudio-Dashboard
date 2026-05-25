import { decryptWebhookSigningSecret } from "@/lib/webhooks/secrets"
import { verifyWebhookSignature } from "@/lib/webhooks/signature"

interface WebhookEndpointCandidate {
  encryptedSecret: string
}

export function findVerifiedWebhookEndpoint<T extends WebhookEndpointCandidate>({
  endpoints,
  signature,
  timestamp,
  endpointId,
  rawBody,
}: {
  endpoints: T[]
  signature: string
  timestamp: string
  endpointId: string | null
  rawBody: string
}) {
  for (const endpoint of endpoints) {
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
    const matchesEndpointSignature =
      endpointId &&
      verifyWebhookSignature({
        signature,
        timestamp,
        webhookId: endpointId,
        rawBody,
        secret: signingSecret,
      })

    if (matchesCanonicalSignature || matchesEndpointSignature) {
      return endpoint
    }
  }

  return null
}
