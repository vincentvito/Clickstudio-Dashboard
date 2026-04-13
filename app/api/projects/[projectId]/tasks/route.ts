import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"

const ASSIGNEE_SELECT = { id: true, name: true, email: true, image: true }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.organizationId },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const { title, columnId, section, assigneeIds } = body

  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 })
  }

  const maxPosition = await prisma.task.aggregate({
    where: { projectId, columnId: columnId ?? "todo" },
    _max: { position: true },
  })

  let validAssigneeIds: string[] = [org.user.id]
  if (assigneeIds?.length) {
    const validMembers = await prisma.member.findMany({
      where: { organizationId: org.organizationId, userId: { in: assigneeIds } },
      select: { userId: true },
    })
    validAssigneeIds = validMembers.map((m) => m.userId)
  }
  const connectAssignees = { connect: validAssigneeIds.map((id) => ({ id })) }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      columnId: columnId ?? "todo",
      section: section ?? "Product",
      position: (maxPosition._max.position ?? -1) + 1,
      projectId,
      assignees: connectAssignees,
    },
    include: {
      assignees: { select: ASSIGNEE_SELECT },
    },
  })

  return Response.json(task, { status: 201 })
}
