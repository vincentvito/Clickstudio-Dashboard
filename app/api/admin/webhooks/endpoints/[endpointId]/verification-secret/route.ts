import prisma from "@/lib/prisma"
import { forbidden, hasPermission, requireOrg, unauthorized } from "@/lib/api-auth"
import { serializeWebhookEndpoint } from "@/lib/webhooks/endpoint-response"
import { encryptWebhookSigningSecret } from "@/lib/webhooks/secrets"

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
  encryptedSecret: true,
}

export async function POST(req: Request, context: RouteContext) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "update")) return forbidden()

  const { endpointId } = await context.params
  const body = (await req.json().catch(() => null)) as { secret?: string } | null
  const secret = body?.secret?.trim()

  if (!secret) {
    return Response.json({ error: "Paste the verification secret from PostRider" }, { status: 400 })
  }

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, organizationId: org.organizationId },
  })

  if (!endpoint) {
    return Response.json({ error: "Webhook endpoint not found" }, { status: 404 })
  }

  let encryptedSecret: string
  try {
    encryptedSecret = encryptWebhookSigningSecret(secret)
  } catch {
    return Response.json(
      { error: "Webhook secret encryption key is not configured" },
      { status: 500 },
    )
  }

  const updated = await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: { encryptedSecret },
    select: endpointSelect,
  })

  return Response.json({
    endpoint: serializeWebhookEndpoint(updated),
  })
}
