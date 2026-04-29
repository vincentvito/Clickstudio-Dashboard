import { after } from "next/server"
import prisma from "@/lib/prisma"
import { sendPushToUser } from "@/lib/push"
import type { NotificationType } from "./types"

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  message: string
  link?: string
}

const PUSH_TITLE: Record<NotificationType, string> = {
  task_assigned: "Task assigned",
  task_mention: "You were mentioned",
  note_mention: "You were mentioned",
  log_mention: "You were mentioned",
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

  // Fan out push after the response is sent. `after()` keeps the work alive
  // past the response so serverless/edge runtimes don't tear it down, and
  // it doesn't add latency to the request that triggered the notification.
  after(() =>
    Promise.allSettled(
      inputs.map((i) =>
        sendPushToUser(i.userId, {
          title: PUSH_TITLE[i.type] ?? "Click Studio",
          body: i.message,
          link: i.link,
          // Collapse repeats to the same destination so the OS replaces
          // instead of stacking five identical pings.
          ...(i.link ? { tag: i.link } : {}),
        }),
      ),
    ),
  )
}
