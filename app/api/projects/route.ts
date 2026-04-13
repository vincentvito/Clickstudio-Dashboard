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
        include: { assignees: { select: { id: true, name: true, email: true, image: true } } },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 1 },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const mapped = projects.map((p) => ({
    ...p,
    state: stateFromPrisma(p.state),
    tasks: p.tasks.map((t) => ({ ...t, section: t.section as string })),
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

  const project = await prisma.project.create({
    data: {
      title: title.trim(),
      brainDump: brainDump ?? "",
      artifactLinks: artifactLinks ?? "",
      state: stateToPrisma(state ?? "Idea") as any,
      organizationId: org.organizationId,
      userId: org.user.id,
    },
  })

  return Response.json({ ...project, state: stateFromPrisma(project.state) }, { status: 201 })
}
