import prisma from "@/lib/prisma"
import { forbidden, hasPermission, requireOrg, unauthorized } from "@/lib/api-auth"
import { serializeWebhookEndpoint } from "@/lib/webhooks/endpoint-response"
import { getDefaultWebhookSourceDefinition } from "@/lib/webhooks/sources"

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

const routingRuleSelect = {
  id: true,
  targetAgent: true,
  target: true,
  isActive: true,
}

export async function POST() {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "create")) return forbidden()
  const sourceDefinition = getDefaultWebhookSourceDefinition()

  const existing = await prisma.webhookEndpoint.findUnique({
    where: {
      organizationId_source_eventSlug: {
        organizationId: org.organizationId,
        source: sourceDefinition.source,
        eventSlug: sourceDefinition.eventSlug,
      },
    },
  })

  if (existing) {
    return Response.json({ error: "Webhook endpoint already exists" }, { status: 409 })
  }

  const { endpoint, telegramRule, agentInboxRule } = await prisma.$transaction(async (tx) => {
    const endpoint = await tx.webhookEndpoint.create({
      data: {
        organizationId: org.organizationId,
        source: sourceDefinition.source,
        eventSlug: sourceDefinition.eventSlug,
        eventType: sourceDefinition.primaryEventType,
        isActive: true,
      },
      select: endpointSelect,
    })

    const existingTelegramRule = await tx.agentRoutingRule.findFirst({
      where: {
        organizationId: org.organizationId,
        source: sourceDefinition.source,
        eventType: sourceDefinition.primaryEventType,
        channel: "telegram",
      },
    })

    const telegramRule = existingTelegramRule
      ? await tx.agentRoutingRule.update({
          where: { id: existingTelegramRule.id },
          data: { targetAgent: existingTelegramRule.targetAgent ?? "Rolino", isActive: true },
          select: routingRuleSelect,
        })
      : await tx.agentRoutingRule.create({
          data: {
            organizationId: org.organizationId,
            source: sourceDefinition.source,
            eventType: sourceDefinition.primaryEventType,
            targetAgent: "Rolino",
            channel: "telegram",
            target: null,
            isActive: true,
          },
          select: routingRuleSelect,
        })

    const existingAgentInboxRule = await tx.agentRoutingRule.findFirst({
      where: {
        organizationId: org.organizationId,
        source: sourceDefinition.source,
        eventType: sourceDefinition.primaryEventType,
        channel: "agent_poll",
      },
    })

    const agentInboxRule = existingAgentInboxRule
      ? await tx.agentRoutingRule.update({
          where: { id: existingAgentInboxRule.id },
          data: { targetAgent: existingAgentInboxRule.targetAgent ?? "Rolino", isActive: true },
          select: routingRuleSelect,
        })
      : await tx.agentRoutingRule.create({
          data: {
            organizationId: org.organizationId,
            source: sourceDefinition.source,
            eventType: sourceDefinition.primaryEventType,
            targetAgent: "Rolino",
            channel: "agent_poll",
            target: null,
            isActive: true,
          },
          select: routingRuleSelect,
        })

    return { endpoint, telegramRule, agentInboxRule }
  })

  return Response.json({
    endpoint: serializeWebhookEndpoint(endpoint),
    telegramRule,
    agentInboxRule,
  })
}
