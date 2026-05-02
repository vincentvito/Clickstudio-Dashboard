import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"

const USER_SELECT = { id: true, name: true, email: true, image: true, isAgent: true } as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> },
) {
  const ctx = await requireAgent(req, "ideas:read")
  if (isAgentResponse(ctx)) return ctx

  const { ideaId } = await params

  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, organizationId: ctx.organizationId },
    include: {
      user: { select: USER_SELECT },
      promotedToProject: { select: { id: true, title: true } },
      nameSuggestions: {
        orderBy: { position: "asc" },
        select: { id: true, name: true, domain: true, rationale: true, position: true },
      },
    },
  })

  if (!idea) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    links: idea.links,
    source: idea.source,
    status: idea.status,
    nameSearchStatus: idea.nameSearchStatus,
    nameSuggestions: idea.nameSuggestions,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    capturedBy: idea.user,
    promotedToProject: idea.promotedToProject,
  })
}
