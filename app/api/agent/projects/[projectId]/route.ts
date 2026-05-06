import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireAgent,
  isAgentResponse,
  canAccessProject,
  hasScope,
} from "@/lib/agent-auth"
import { stateToPrisma, stateFromPrisma } from "@/lib/enum-map"
import { detectUnknownFields, unknownFieldWarnings } from "@/lib/agent-fields"

const USER_SELECT = { id: true, name: true, email: true, image: true, isAgent: true } as const

const PROJECT_UPDATE_FIELDS = ["title", "brainDump", "artifactLinks", "state"] as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await requireAgent(req, "projects:read")
  if (isAgentResponse(ctx)) return ctx

  const { projectId } = await params
  if (!canAccessProject(ctx, projectId)) {
    return Response.json({ error: "Forbidden", hint: "Project not in token scope" }, { status: 403 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    include: {
      user: { select: USER_SELECT },
      tasks: {
        orderBy: { position: "asc" },
        include: { assignees: { select: USER_SELECT } },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 10 },
      favoritedBy: { select: USER_SELECT },
    },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({
    id: project.id,
    title: project.title,
    brainDump: project.brainDump,
    artifactLinks: project.artifactLinks,
    state: stateFromPrisma(project.state),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    owner: project.user,
    favoritedBy: project.favoritedBy,
    isFavorite: project.favoritedBy.some((u) => u.id === ctx.agentUserId),
    tasks: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      columnId: t.columnId,
      section: t.section,
      position: t.position,
      assignees: t.assignees,
    })),
    logs: project.logs.map((l) => ({ id: l.id, text: l.text, createdAt: l.createdAt })),
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await requireAgent(req, "projects:write")
  if (isAgentResponse(ctx)) return ctx

  const { projectId } = await params
  if (!canAccessProject(ctx, projectId)) {
    return Response.json({ error: "Forbidden", hint: "Project not in token scope" }, { status: 403 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
  })
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const unknownFields = detectUnknownFields(body, PROJECT_UPDATE_FIELDS)
  const nextState =
    body.state !== undefined ? (stateToPrisma(body.state) as never) : undefined
  const stateChanged = nextState !== undefined && nextState !== project.state

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.project.update({
      where: { id: projectId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.brainDump !== undefined && { brainDump: body.brainDump }),
        ...(body.artifactLinks !== undefined && { artifactLinks: body.artifactLinks }),
        ...(nextState !== undefined && { state: nextState }),
      },
    })
    if (stateChanged) {
      await tx.projectStateTransition.create({
        data: {
          projectId: result.id,
          fromState: project.state,
          toState: nextState!,
          userId: ctx.agentUserId,
        },
      })
    }
    return result
  })

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json({
    id: updated.id,
    title: updated.title,
    state: stateFromPrisma(updated.state),
    updatedAt: updated.updatedAt,
    ...(warnings.length > 0 && { warnings }),
  })
}
