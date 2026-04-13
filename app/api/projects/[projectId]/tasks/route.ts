import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function POST(
  req: NextRequest,
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

  const body = await req.json()
  const { title, columnId, section } = body

  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 })
  }

  const maxPosition = await prisma.task.aggregate({
    where: { projectId, columnId: columnId ?? "todo" },
    _max: { position: true },
  })

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      columnId: columnId ?? "todo",
      section: section ?? "Product",
      position: (maxPosition._max.position ?? -1) + 1,
      projectId,
    },
  })

  return Response.json(task, { status: 201 })
}
