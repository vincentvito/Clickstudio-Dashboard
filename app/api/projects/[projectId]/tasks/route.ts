import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { createNotifications } from "@/lib/notifications"
import { extractMentionedUserIds } from "@/lib/mentions"

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
  const { title, columnId, section, assigneeIds, description } = body

  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 })
  }

  const descriptionValue = typeof description === "string" ? description : ""

  const [maxPosition, validMembers] = await Promise.all([
    prisma.task.aggregate({
      where: { projectId, columnId: columnId ?? "todo" },
      _max: { position: true },
    }),
    assigneeIds?.length
      ? prisma.member.findMany({
          where: { organizationId: org.organizationId, userId: { in: assigneeIds } },
          select: { userId: true },
        })
      : Promise.resolve(null),
  ])

  const validAssigneeIds: string[] = validMembers
    ? validMembers.map((m) => m.userId)
    : [org.user.id]
  const connectAssignees = { connect: validAssigneeIds.map((id) => ({ id })) }

  const initialColumnId = columnId ?? "todo"

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: title.trim(),
        description: descriptionValue,
        columnId: initialColumnId,
        section: section ?? "Product",
        position: (maxPosition._max.position ?? -1) + 1,
        projectId,
        assignees: connectAssignees,
      },
      include: {
        assignees: { select: ASSIGNEE_SELECT },
      },
    })
    await tx.taskTransition.create({
      data: {
        taskId: created.id,
        fromColumnId: null,
        toColumnId: initialColumnId,
        userId: org.user.id,
      },
    })
    return created
  })

  const inviterName = org.user.name || org.user.email
  const taskLink = `/dashboard/${projectId}?tab=tasks&task=${task.id}`

  // Assignees get `task_assigned`; anyone @-mentioned in the description who
  // isn't already being assigned gets `task_mention` instead (no double-notify).
  const assignedUserIds = validAssigneeIds.filter((id) => id !== org.user.id)
  const mentionedUserIds = extractMentionedUserIds(descriptionValue).filter(
    (id) => id !== org.user.id && !assignedUserIds.includes(id),
  )

  const mentionedMembers = mentionedUserIds.length
    ? await prisma.member.findMany({
        where: { organizationId: org.organizationId, userId: { in: mentionedUserIds } },
        select: { userId: true },
      })
    : []

  await createNotifications([
    ...assignedUserIds.map((userId) => ({
      userId,
      type: "task_assigned" as const,
      message: `${inviterName} assigned you to "${task.title}"`,
      link: taskLink,
    })),
    ...mentionedMembers.map((m) => ({
      userId: m.userId,
      type: "task_mention" as const,
      message: `${inviterName} mentioned you in "${task.title}"`,
      link: taskLink,
    })),
  ])

  return Response.json(task, { status: 201 })
}
