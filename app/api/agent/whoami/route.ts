import { NextRequest } from "next/server"
import { resolveAgentContext } from "@/lib/agent-auth"

export async function GET(req: NextRequest) {
  const ctx = await resolveAgentContext(req)
  if (!ctx) {
    return Response.json(
      { error: "Unauthorized", hint: "Provide Authorization: Bearer ccs_..." },
      { status: 401 },
    )
  }

  return Response.json({
    tokenId: ctx.tokenId,
    organizationId: ctx.organizationId,
    agent: {
      id: ctx.agentUserId,
      name: ctx.agentName,
    },
    scopes: ctx.scopes,
    projectIds: ctx.projectIds,
    accessAllProjects: ctx.projectIds.length === 0,
  })
}
