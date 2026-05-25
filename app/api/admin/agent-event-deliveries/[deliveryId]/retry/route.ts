import { after } from "next/server"
import prisma from "@/lib/prisma"
import { forbidden, hasPermission, requireOrg, unauthorized } from "@/lib/api-auth"
import { processAgentEventDelivery } from "@/lib/agent-events/route-agent-event"

interface RouteContext {
  params: Promise<{ deliveryId: string }>
}

export async function POST(_req: Request, context: RouteContext) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "update")) return forbidden()

  const { deliveryId } = await context.params
  const delivery = await prisma.agentEventDelivery.findFirst({
    where: {
      id: deliveryId,
      event: { organizationId: org.organizationId },
    },
  })

  if (!delivery) {
    return Response.json({ error: "Delivery not found" }, { status: 404 })
  }

  if (delivery.status !== "failed") {
    return Response.json({ error: "Only failed deliveries can be retried" }, { status: 400 })
  }

  await prisma.agentEventDelivery.update({
    where: { id: delivery.id },
    data: { status: "pending", lastError: null },
  })

  after(() => processAgentEventDelivery(delivery.id))

  return Response.json({ ok: true, deliveryId: delivery.id, status: "pending" })
}
