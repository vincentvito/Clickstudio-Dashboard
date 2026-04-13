import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"

const ASSIGNEE_SELECT = { id: true, name: true, email: true, image: true }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: org.organizationId } },
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
      ...(body.assigneeIds !== undefined && {
        assignees: {
          set: body.assigneeIds.map((id: string) => ({ id })),
        },
      }),
    },
    include: {
      assignees: { select: ASSIGNEE_SELECT },
    },
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: org.organizationId } },
  })

  if (!task) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.task.delete({ where: { id: taskId } })

  return Response.json({ ok: true })
}
