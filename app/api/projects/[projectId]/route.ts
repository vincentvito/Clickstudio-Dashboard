import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      tasks: { orderBy: { position: "asc" } },
      logs: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { projectId } = await params
  const body = await req.json()

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
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
      ...(body.state !== undefined && { state: body.state }),
    },
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.project.delete({ where: { id: projectId } })

  return Response.json({ ok: true })
}
