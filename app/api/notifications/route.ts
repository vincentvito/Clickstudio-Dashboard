import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  })

  return Response.json({ notifications, unreadCount })
}
