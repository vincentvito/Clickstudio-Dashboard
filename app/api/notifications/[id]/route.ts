import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { id } = await params

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  })

  if (!notification) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  })

  return Response.json(updated)
}
