import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { noteId } = await params

  const note = await prisma.note.findFirst({
    where: { id: noteId, project: { organizationId: org.organizationId } },
  })

  if (!note) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { noteId } = await params

  const note = await prisma.note.findFirst({
    where: { id: noteId, project: { organizationId: org.organizationId } },
  })

  if (!note) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.note.delete({ where: { id: noteId } })

  return Response.json({ ok: true })
}
