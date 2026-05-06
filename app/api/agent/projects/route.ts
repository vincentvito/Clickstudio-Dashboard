import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"
import { stateToPrisma, stateFromPrisma } from "@/lib/enum-map"
import {
  detectUnknownFields,
  unknownFieldWarnings,
  fieldError,
} from "@/lib/agent-fields"

const USER_SELECT = { id: true, name: true, email: true, image: true, isAgent: true } as const

const PROJECT_CREATE_FIELDS = ["title", "brainDump", "artifactLinks", "state"] as const

export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "projects:read")
  if (isAgentResponse(ctx)) return ctx

  const projects = await prisma.project.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(ctx.projectIds.length > 0 && { id: { in: ctx.projectIds } }),
    },
    include: {
      user: { select: USER_SELECT },
      _count: { select: { tasks: true } },
      // The full favoritedBy roster lets agents see who else has starred a
      // project, so they can answer "what is Vlad working on right now?"
      // without scraping. `isFavorite` is derived from this set against the
      // agent's own user ID.
      favoritedBy: { select: USER_SELECT },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(
    projects.map((p) => ({
      id: p.id,
      title: p.title,
      brainDump: p.brainDump,
      artifactLinks: p.artifactLinks,
      state: stateFromPrisma(p.state),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      owner: p.user,
      taskCount: p._count.tasks,
      favoritedBy: p.favoritedBy,
      isFavorite: p.favoritedBy.some((u) => u.id === ctx.agentUserId),
    })),
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireAgent(req, "projects:write")
  if (isAgentResponse(ctx)) return ctx

  const body = await req.json().catch(() => ({}))
  const unknownFields = detectUnknownFields(body, PROJECT_CREATE_FIELDS)
  const title: string = (body.title ?? "").trim()
  const brainDump: string = body.brainDump ?? ""
  const artifactLinks: string = body.artifactLinks ?? ""
  const state: string = body.state ?? "Backlog"

  if (!title) {
    return fieldError("title", "title is required")
  }

  // Token-scoped agents can only create projects if they have access to all
  // projects (empty projectIds). A token scoped to a specific project list
  // shouldn't be able to mint new projects outside that scope.
  if (ctx.projectIds.length > 0) {
    return Response.json(
      { error: "This token is scoped to specific projects and cannot create new ones" },
      { status: 403 },
    )
  }

  const initialState = stateToPrisma(state) as never

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        title,
        brainDump,
        artifactLinks,
        state: initialState,
        organizationId: ctx.organizationId,
        userId: ctx.agentUserId,
      },
    })
    await tx.projectStateTransition.create({
      data: {
        projectId: created.id,
        fromState: null,
        toState: initialState,
        userId: ctx.agentUserId,
      },
    })
    return created
  })

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json(
    {
      id: project.id,
      title: project.title,
      state: stateFromPrisma(project.state),
      createdAt: project.createdAt,
      ...(warnings.length > 0 && { warnings }),
    },
    { status: 201 },
  )
}
