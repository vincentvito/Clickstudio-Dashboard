import "server-only"
import webpush from "web-push"
import prisma from "./prisma"

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:vlad.palacio@gmail.com"

let configured = false
function ensureConfigured() {
  if (configured) return
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    throw new Error("VAPID keys not configured")
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  link?: string
  icon?: string
  tag?: string
}

export function isPushConfigured() {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE)
}

/**
 * Fan a single push payload out to all of a user's subscribed devices.
 * Errors per-device — gone subscriptions (404/410) are pruned automatically.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!isPushConfigured()) return
  ensureConfigured()

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  const body = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        )
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
        }
      }
    }),
  )
}
