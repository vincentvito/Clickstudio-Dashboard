import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"
import { stateToPrisma, stateFromPrisma } from "@/lib/enum-map"

const USER_SELECT = { id: true, name: true, email: true, image: true, isAgent: true } as const

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
    })),
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireAgent(req, "projects:write")
  if (isAgentResponse(ctx)) return ctx

  const body = await req.json().catch(() => ({}))
  const title: string = (body.title ?? "").trim()
  const brainDump: string = body.brainDump ?? ""
  const artifactLinks: string = body.artifactLinks ?? ""
  const state: string = body.state ?? "Backlog"

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 })
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

  return Response.json(
    {
      id: project.id,
      title: project.title,
      state: stateFromPrisma(project.state),
      createdAt: project.createdAt,
    },
    { status: 201 },
  )
}
