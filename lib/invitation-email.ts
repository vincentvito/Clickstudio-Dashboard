import { sendEmail } from "./email"

export async function sendInvitationEmail(
  email: string,
  orgName: string,
  inviterName: string,
  role: string,
  acceptUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const roleLabel = role === "admin" ? "Admin" : "Member"

  const permissions =
    role === "admin"
      ? `
        <li>Create, edit, and delete projects</li>
        <li>Manage tasks and daily logs</li>
        <li>Invite and manage team members</li>
      `
      : `
        <li>View all projects</li>
        <li>Create, edit, and move tasks</li>
        <li>Post daily log updates</li>
      `

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #111; margin: 0 0 4px 0;">
          Click Studio
        </h2>
        <p style="font-size: 13px; color: #999; margin: 0;">Control Center</p>
      </div>

      <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 24px;">
        <strong>${inviterName}</strong> invited you to join
        <strong>${orgName}</strong> as a <strong>${roleLabel}</strong>.
      </p>

      <div style="background: #f8f8f8; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="font-size: 13px; font-weight: 600; color: #333; margin: 0 0 8px 0;">
          As a ${roleLabel}, you'll be able to:
        </p>
        <ul style="font-size: 13px; color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
          ${permissions}
        </ul>
      </div>

      <a href="${acceptUrl}"
         style="display: inline-block; background: #4f46e5; color: #fff; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
        Accept Invitation
      </a>

      <p style="font-size: 12px; color: #bbb; margin-top: 32px; line-height: 1.5;">
        This invitation expires in 48 hours. If you can't click the button, copy this link:<br/>
        <a href="${acceptUrl}" style="color: #999; word-break: break-all;">${acceptUrl}</a>
      </p>

      <p style="font-size: 12px; color: #bbb; margin-top: 16px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `

  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to ${orgName} on Click Studio`,
    html,
  })
}
