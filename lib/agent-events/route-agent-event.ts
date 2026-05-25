import prisma from "@/lib/prisma"
import { createNotifications } from "@/lib/notifications"
import { deliverTelegramAgentEvent } from "@/lib/agent-events/deliveries/telegram"
import { postriderMessageReceivedSchema } from "@/lib/webhooks/sources/postrider"

function getDeliveryErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Delivery failed"
}

async function updateEventStatus(eventId: string) {
  const deliveries = await prisma.agentEventDelivery.findMany({
    where: { eventId },
    select: { status: true },
  })

  if (deliveries.length === 0) {
    await prisma.agentEvent.update({
      where: { id: eventId },
      data: { status: "ignored", handledAt: new Date() },
    })
    return
  }

  const hasFailed = deliveries.some((delivery) => delivery.status === "failed")
  const allFinished = deliveries.every((delivery) =>
    ["delivered", "failed", "skipped"].includes(delivery.status),
  )
  const allSuccessful = deliveries.every((delivery) =>
    ["delivered", "skipped"].includes(delivery.status),
  )

  await prisma.agentEvent.update({
    where: { id: eventId },
    data: {
      status: hasFailed ? "failed" : allSuccessful ? "handled" : "routed",
      handledAt: allFinished ? new Date() : null,
    },
  })
}

export async function processAgentEventDelivery(deliveryId: string) {
  const delivery = await prisma.agentEventDelivery.findUnique({
    where: { id: deliveryId },
    include: { event: true },
  })

  if (!delivery || delivery.status === "delivered" || delivery.status === "skipped") {
    return delivery
  }

  try {
    if (delivery.channel === "telegram") {
      await deliverTelegramAgentEvent(delivery)
    } else {
      await prisma.agentEventDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "skipped",
          attempts: { increment: 1 },
          lastError: `Unsupported delivery channel: ${delivery.channel}`,
        },
      })
      await updateEventStatus(delivery.eventId)
      return delivery
    }

    await prisma.agentEventDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "delivered",
        attempts: { increment: 1 },
        lastError: null,
        deliveredAt: new Date(),
      },
    })
  } catch (error) {
    await prisma.agentEventDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "failed",
        attempts: { increment: 1 },
        lastError: getDeliveryErrorMessage(error),
      },
    })
  }

  await updateEventStatus(delivery.eventId)
  return delivery
}

export async function routeAgentEvent(eventId: string) {
  const deliveries = await prisma.agentEventDelivery.findMany({
    where: { eventId, status: "pending" },
    select: { id: true },
  })

  await Promise.allSettled(deliveries.map((delivery) => processAgentEventDelivery(delivery.id)))
  await updateEventStatus(eventId)
}

export async function notifyPostriderMessageReceived(eventId: string) {
  const event = await prisma.agentEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      organizationId: true,
      payload: true,
    },
  })

  if (!event) return

  const parsed = postriderMessageReceivedSchema.safeParse(event.payload)
  if (!parsed.success) return

  const members = await prisma.member.findMany({
    where: {
      organizationId: event.organizationId,
      role: { in: ["owner", "admin"] },
    },
    select: { userId: true },
  })

  await createNotifications(
    members.map((member) => ({
      userId: member.userId,
      type: "postrider_message_received",
      message: `New PostRiderAI message from ${parsed.data.message.from}: ${
        parsed.data.message.subject ?? "(no subject)"
      }`,
      link: `/dashboard/admin/webhooks?event=${event.id}`,
    })),
  )
}
