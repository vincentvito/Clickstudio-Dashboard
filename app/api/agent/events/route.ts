import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { resolveAgentContext } from "@/lib/agent-auth"
import {
  agentEventAccessWhere,
  OPEN_AGENT_EVENT_STATUSES,
  serializeAgentEvent,
} from "@/lib/agent-events/api"

function unauthorized() {
  return Response.json(
    { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
    { status: 401 },
  )
}

function parseLimit(value: string | null) {
  return Math.min(Math.max(parseInt(value ?? "25", 10) || 25, 1), 100)
}

function getStatusFilter(status: string) {
  if (status === "all") return {}
  if (status === "open") return { status: { in: [...OPEN_AGENT_EVENT_STATUSES] } }
  if (status === "acked") return { status: { in: ["acked", "handled"] } }
  return { status }
}

export async function GET(req: NextRequest) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const source = url.searchParams.get("source")
  const eventType = url.searchParams.get("eventType")
  const status = url.searchParams.get("status") ?? "open"
  const limit = parseLimit(url.searchParams.get("limit"))
  const includePayload = url.searchParams.get("includePayload") === "true"

  const events = await prisma.agentEvent.findMany({
    where: {
      ...agentEventAccessWhere(ctx),
      ...(source ? { source } : {}),
      ...(eventType ? { eventType } : {}),
      ...getStatusFilter(status),
    },
    include: {
      deliveries: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { receivedAt: "asc" },
    take: limit,
  })

  return Response.json(events.map((event) => serializeAgentEvent(event, { includePayload })))
}
