import prisma from "@/lib/prisma"
import { forbidden, hasPermission, requireOrg, unauthorized } from "@/lib/api-auth"
import { serializeWebhookEndpoint } from "@/lib/webhooks/endpoint-response"
import {
  POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG,
  POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
  POSTRIDER_SOURCE,
} from "@/lib/webhooks/sources/postrider"

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

const telegramRuleSelect = {
  id: true,
  targetAgent: true,
  target: true,
  isActive: true,
}

export async function POST() {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "create")) return forbidden()

  const existing = await prisma.webhookEndpoint.findUnique({
    where: {
      organizationId_source_eventSlug: {
        organizationId: org.organizationId,
        source: POSTRIDER_SOURCE,
        eventSlug: POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG,
      },
    },
  })

  if (existing) {
    return Response.json({ error: "Webhook endpoint already exists" }, { status: 409 })
  }

  const { endpoint, telegramRule } = await prisma.$transaction(async (tx) => {
    const endpoint = await tx.webhookEndpoint.create({
      data: {
        organizationId: org.organizationId,
        source: POSTRIDER_SOURCE,
        eventSlug: POSTRIDER_MESSAGE_RECEIVED_EVENT_SLUG,
        eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
        isActive: true,
      },
      select: endpointSelect,
    })

    const existingTelegramRule = await tx.agentRoutingRule.findFirst({
      where: {
        organizationId: org.organizationId,
        source: POSTRIDER_SOURCE,
        eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
        channel: "telegram",
      },
    })

    const telegramRule = existingTelegramRule
      ? await tx.agentRoutingRule.update({
          where: { id: existingTelegramRule.id },
          data: { targetAgent: existingTelegramRule.targetAgent ?? "Rolino", isActive: true },
          select: telegramRuleSelect,
        })
      : await tx.agentRoutingRule.create({
          data: {
            organizationId: org.organizationId,
            source: POSTRIDER_SOURCE,
            eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
            targetAgent: "Rolino",
            channel: "telegram",
            target: null,
            isActive: true,
          },
          select: telegramRuleSelect,
        })

    return { endpoint, telegramRule }
  })

  return Response.json({
    endpoint: serializeWebhookEndpoint(endpoint),
    telegramRule,
  })
}
