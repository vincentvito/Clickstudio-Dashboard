import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId: user.id } },
  })

  if (!task) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.columnId !== undefined && { columnId: body.columnId }),
      ...(body.section !== undefined && { section: body.section }),
      ...(body.position !== undefined && { position: body.position }),
    },
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId: user.id } },
  })

  if (!task) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.task.delete({ where: { id: taskId } })

  return Response.json({ ok: true })
}
