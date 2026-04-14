import prisma from "@/lib/prisma"
import type { NotificationType } from "./types"

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  message: string
  link?: string
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return
  await prisma.notification.createMany({
    data: inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      message: i.message,
      link: i.link ?? null,
    })),
  })
}
