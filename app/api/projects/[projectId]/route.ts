import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"
import { stateToPrisma, stateFromPrisma } from "@/lib/enum-map"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.organizationId },
    include: {
      tasks: {
        orderBy: { position: "asc" },
        include: { assignees: { select: { id: true, name: true, email: true, image: true } } },
      },
      logs: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({
    ...project,
    state: stateFromPrisma(project.state),
    tasks: project.tasks.map((t) => ({ ...t, section: t.section as string })),
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  if (!hasPermission(org.role, "update")) return forbidden()

  const { projectId } = await params
  const body = await req.json()

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.organizationId },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.brainDump !== undefined && { brainDump: body.brainDump }),
      ...(body.artifactLinks !== undefined && { artifactLinks: body.artifactLinks }),
      ...(body.state !== undefined && { state: stateToPrisma(body.state) as any }),
    },
  })

  return Response.json({ ...updated, state: stateFromPrisma(updated.state) })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  if (!hasPermission(org.role, "delete")) return forbidden()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.organizationId },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.project.delete({ where: { id: projectId } })

  return Response.json({ ok: true })
}
