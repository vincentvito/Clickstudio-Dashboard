import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      tasks: true,
      logs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(projects)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

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
      state: state ?? "Idea",
      userId: user.id,
    },
  })

  return Response.json(project, { status: 201 })
}
