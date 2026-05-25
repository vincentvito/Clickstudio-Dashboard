import prisma from "@/lib/prisma"
import { forbidden, hasPermission, requireOrg, unauthorized } from "@/lib/api-auth"
import {
  POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
  POSTRIDER_SOURCE,
} from "@/lib/webhooks/sources/postrider"

const routingRuleSelect = {
  id: true,
  targetAgent: true,
  target: true,
  isActive: true,
}

export async function POST(req: Request) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "update")) return forbidden()

  const body = (await req.json().catch(() => null)) as {
    enabled?: boolean
    target?: string | null
    targetAgent?: string | null
  } | null

  if (!body || typeof body.enabled !== "boolean") {
    return Response.json({ error: "Pass { enabled: boolean }" }, { status: 400 })
  }

  const existing = await prisma.agentRoutingRule.findFirst({
    where: {
      organizationId: org.organizationId,
      source: POSTRIDER_SOURCE,
      eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
      channel: "telegram",
    },
  })

  const data = {
    target: body.target?.trim() || null,
    targetAgent: body.targetAgent?.trim() || "Rolino",
    isActive: body.enabled,
  }

  const rule = existing
    ? await prisma.agentRoutingRule.update({
        where: { id: existing.id },
        data,
        select: routingRuleSelect,
      })
    : await prisma.agentRoutingRule.create({
        data: {
          organizationId: org.organizationId,
          source: POSTRIDER_SOURCE,
          eventType: POSTRIDER_MESSAGE_RECEIVED_EVENT_TYPE,
          channel: "telegram",
          ...data,
        },
        select: routingRuleSelect,
      })

  return Response.json({ rule })
}
