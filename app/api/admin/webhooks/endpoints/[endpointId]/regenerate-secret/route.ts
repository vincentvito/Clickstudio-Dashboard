import prisma from "@/lib/prisma"
import { forbidden, hasPermission, requireOrg, unauthorized } from "@/lib/api-auth"
import { encryptWebhookSigningSecret, generateWebhookSigningSecret } from "@/lib/webhooks/secrets"

interface RouteContext {
  params: Promise<{ endpointId: string }>
}

const endpointSelect = {
  id: true,
  source: true,
  eventSlug: true,
  eventType: true,
  isActive: true,
  lastReceivedAt: true,
  createdAt: true,
}

export async function POST(_req: Request, context: RouteContext) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "update")) return forbidden()

  const { endpointId } = await context.params
  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, organizationId: org.organizationId },
  })

  if (!endpoint) {
    return Response.json({ error: "Webhook endpoint not found" }, { status: 404 })
  }

  const signingSecret = generateWebhookSigningSecret()
  let encryptedSecret: string

  try {
    encryptedSecret = encryptWebhookSigningSecret(signingSecret)
  } catch {
    return Response.json(
      { error: "Webhook secret encryption key is not configured" },
      { status: 500 },
    )
  }

  const updated = await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: {
      encryptedSecret,
    },
    select: endpointSelect,
  })

  return Response.json({ endpoint: updated, signingSecret })
}
