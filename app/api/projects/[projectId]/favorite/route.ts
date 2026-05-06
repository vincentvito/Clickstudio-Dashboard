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
    select: { id: true },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const userId = org.user.id

  let isFavorite: boolean
  if (typeof body?.favorite === "boolean") {
    isFavorite = body.favorite
  } else {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, favoritedBy: { some: { id: userId } } },
      select: { id: true },
    })
    isFavorite = !existing
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      favoritedBy: isFavorite
        ? { connect: { id: userId } }
        : { disconnect: { id: userId } },
    },
  })

  return Response.json({ id: projectId, isFavorite })
}
