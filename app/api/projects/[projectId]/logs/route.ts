import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"

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
  const { text } = body

  if (!text?.trim()) {
    return Response.json({ error: "Text is required" }, { status: 400 })
  }

  const log = await prisma.logEntry.create({
    data: {
      text: text.trim(),
      projectId,
    },
  })

  return Response.json(log, { status: 201 })
}
