import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"
import { stateToPrisma, stateFromPrisma } from "@/lib/enum-map"

export async function GET() {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const projects = await prisma.project.findMany({
    where: { organizationId: org.organizationId },
    include: {
      tasks: {
        include: { assignees: { select: { id: true, name: true, email: true, image: true, isAgent: true } } },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 1 },
      user: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
      favoritedBy: { where: { id: org.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const mapped = projects.map(({ favoritedBy, ...p }) => ({
    ...p,
    state: stateFromPrisma(p.state),
    tasks: p.tasks.map((t) => ({ ...t, section: t.section as string })),
    isFavorite: favoritedBy.length > 0,
  }))

  return Response.json(mapped)
}

export async function POST(req: NextRequest) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  if (!hasPermission(org.role, "create")) return forbidden()

  const body = await req.json()
  const { title, brainDump, artifactLinks, state } = body

  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 })
  }

  const initialState = stateToPrisma(state ?? "Backlog") as any

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        title: title.trim(),
        brainDump: brainDump ?? "",
        artifactLinks: artifactLinks ?? "",
        state: initialState,
        organizationId: org.organizationId,
        userId: org.user.id,
      },
    })
    await tx.projectStateTransition.create({
      data: {
        projectId: created.id,
        fromState: null,
        toState: initialState,
        userId: org.user.id,
      },
    })
    return created
  })

  return Response.json({ ...project, state: stateFromPrisma(project.state) }, { status: 201 })
}
