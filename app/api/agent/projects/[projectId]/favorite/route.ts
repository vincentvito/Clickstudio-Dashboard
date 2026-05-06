import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireAgent,
  isAgentResponse,
  canAccessProject,
} from "@/lib/agent-auth"
import {
  detectUnknownFields,
  unknownFieldWarnings,
} from "@/lib/agent-fields"

const FAVORITE_FIELDS = ["favorite"] as const

// Bearer-authed mirror of POST /api/projects/[projectId]/favorite. Toggles
// or sets the favorite state for the agent's own synthetic user — so an
// agent can mark "what I'm working on" and humans see ★ on those projects
// (and vice versa). Required scope is `projects:read`: starring is a
// view/preference operation, not a project-content mutation.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await requireAgent(req, "projects:read")
  if (isAgentResponse(ctx)) return ctx

  const { projectId } = await params
  if (!canAccessProject(ctx, projectId)) {
    return Response.json(
      { error: "Forbidden", hint: "Project not in token scope" },
      { status: 403 },
    )
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const unknownFields = detectUnknownFields(body, FAVORITE_FIELDS)

  let isFavorite: boolean
  if (typeof body?.favorite === "boolean") {
    isFavorite = body.favorite
  } else {
    // Toggle: if the agent's user is currently in favoritedBy, remove; else add.
    const existing = await prisma.project.findFirst({
      where: { id: projectId, favoritedBy: { some: { id: ctx.agentUserId } } },
      select: { id: true },
    })
    isFavorite = !existing
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      favoritedBy: isFavorite
        ? { connect: { id: ctx.agentUserId } }
        : { disconnect: { id: ctx.agentUserId } },
    },
  })

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json({
    id: projectId,
    isFavorite,
    ...(warnings.length > 0 && { warnings }),
  })
}
