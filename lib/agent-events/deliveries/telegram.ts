import {
  postriderMessageReceivedSchema,
  type PostriderMessageReceivedPayload,
} from "@/lib/webhooks/sources/postrider"

interface TelegramEventDelivery {
  id: string
  target: string | null
  event: {
    id: string
    targetAgent: string | null
    externalId: string
    providerMessageId: string | null
    payload: unknown
  }
}

function formatSender(payload: PostriderMessageReceivedPayload) {
  return payload.message.from_name
    ? `${payload.message.from_name} <${payload.message.from}>`
    : payload.message.from
}

function formatAgentAnnouncement(agentName: string | null) {
  const displayName = agentName?.trim() || "Rolino"

  if (displayName.startsWith("@")) {
    return `${displayName} New PostRiderAI message for ${displayName.slice(1)}`
  }

  const compactName = displayName.replace(/[^A-Za-z0-9_]/g, "")
  const mention = compactName ? `@${compactName}Bot ` : ""

  return `${mention}New PostRiderAI message for ${displayName}`
}

export function formatTelegramAgentEventMessage(delivery: TelegramEventDelivery) {
  const parsed = postriderMessageReceivedSchema.safeParse(delivery.event.payload)

  if (!parsed.success) {
    return [
      "New agent event",
      "",
      `Message ID: ${delivery.event.providerMessageId ?? "Unknown"}`,
      `Event ID: ${delivery.event.externalId}`,
    ].join("\n")
  }

  const payload = parsed.data
  const subject = payload.message.subject ?? "(no subject)"

  return [
    formatAgentAnnouncement(delivery.event.targetAgent),
    "",
    `Message ID: ${payload.message.message_id}`,
    `Subject: ${subject}`,
    `From: ${formatSender(payload)}`,
    "Action: Fetch and process this email.",
  ].join("\n")
}

export async function deliverTelegramAgentEvent(delivery: TelegramEventDelivery) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = delivery.target || process.env.TELEGRAM_CHAT_ID

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured")
  }

  if (!chatId) {
    throw new Error("Telegram delivery target is missing")
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatTelegramAgentEventMessage(delivery),
      disable_web_page_preview: true,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Telegram delivery failed: ${response.status} ${body}`.trim())
  }
}
