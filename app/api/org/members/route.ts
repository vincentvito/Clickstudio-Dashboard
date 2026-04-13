import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { requireOrg, unauthorized, forbidden } from "@/lib/api-auth"
import { sendInvitationEmail } from "@/lib/invitation-email"

export async function POST(req: NextRequest) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  if (org.role !== "owner" && org.role !== "admin") {
    return forbidden()
  }

  const body = await req.json()
  const { emails, role } = body as { emails: string[]; role: string }

  if (!emails?.length || emails.length > 20) {
    return Response.json({ error: "Provide 1-20 email addresses" }, { status: 400 })
  }

  if (role !== "admin" && role !== "member") {
    return Response.json({ error: "Role must be admin or member" }, { status: 400 })
  }

  const results: { email: string; status: string; error?: string }[] = []
  const hdrs = await headers()
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"

  for (const email of emails) {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes("@")) {
      results.push({ email: trimmed, status: "error", error: "Invalid email" })
      continue
    }

    try {
      const invitation = await auth.api.createInvitation({
        body: {
          email: trimmed,
          role,
          organizationId: org.organizationId,
        },
        headers: hdrs,
      })

      if (!invitation) {
        results.push({ email: trimmed, status: "error", error: "Failed to create invitation" })
        continue
      }

      const acceptUrl = `${baseUrl}/auth/invite/${invitation.id}`

      await sendInvitationEmail(
        trimmed,
        invitation.organization?.name ?? "Click Studio",
        org.user.name ?? org.user.email,
        role,
        acceptUrl,
      )

      results.push({ email: trimmed, status: "sent" })
    } catch (e: any) {
      const msg = e?.message ?? ""
      if (msg.includes("already a member")) {
        results.push({ email: trimmed, status: "already_member" })
      } else if (msg.includes("already been invited")) {
        results.push({ email: trimmed, status: "already_invited" })
      } else {
        results.push({ email: trimmed, status: "error", error: msg || "Failed to invite" })
      }
    }
  }

  return Response.json({ results })
}
