interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiUrl = process.env.ZEPTOMAIL_API_URL
  const apiKey = process.env.ZEPTO_MAIL_API_KEY
  const fromEmail = process.env.EMAIL_FROM ?? "noreply@clickstudio.com"
  const fromName = process.env.EMAIL_FROM_NAME ?? "Clickstudio"

  if (!apiUrl || !apiKey) {
    console.error("ZeptoMail not configured: missing ZEPTOMAIL_API_URL or ZEPTO_MAIL_API_KEY")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const res = await fetch(`https://${apiUrl}v1.1/email`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        from: { address: fromEmail, name: fromName },
        to: [{ email_address: { address: to } }],
        subject,
        htmlbody: html,
        textbody: html.replace(/<[^>]*>/g, ""),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("ZeptoMail error:", res.status, err)
      return { success: false, error: `Email delivery failed (${res.status})` }
    }

    return { success: true }
  } catch (err) {
    console.error("ZeptoMail error:", err)
    return { success: false, error: "Email delivery failed" }
  }
}
