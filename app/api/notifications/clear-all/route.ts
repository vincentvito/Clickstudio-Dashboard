import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function POST() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  await prisma.notification.deleteMany({
    where: { userId: user.id },
  })

  return Response.json({ ok: true })
}
