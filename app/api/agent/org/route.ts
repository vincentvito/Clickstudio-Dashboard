import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"

export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "org:read")
  if (isAgentResponse(ctx)) return ctx

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { members: true, projects: true } },
    },
  })

  if (!org) {
    return Response.json({ error: "Organization not found" }, { status: 404 })
  }

  return Response.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt,
    memberCount: org._count.members,
    projectCount: org._count.projects,
  })
}
