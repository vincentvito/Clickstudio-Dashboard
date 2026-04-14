import { sendEmail } from "./email"

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

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
        <li style="color: #a1a1aa; padding: 2px 0;">Create, edit, and delete projects</li>
        <li style="color: #a1a1aa; padding: 2px 0;">Manage tasks and daily logs</li>
        <li style="color: #a1a1aa; padding: 2px 0;">Invite and manage team members</li>
      `
      : `
        <li style="color: #a1a1aa; padding: 2px 0;">View all projects</li>
        <li style="color: #a1a1aa; padding: 2px 0;">Create, edit, and move tasks</li>
        <li style="color: #a1a1aa; padding: 2px 0;">Post daily log updates</li>
      `

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #09090b; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 48px 24px;">

        <!-- Header -->
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 18px; font-weight: 700; color: #fafafa; margin: 0 0 4px 0; letter-spacing: -0.025em;">
            Click Studio
          </h1>
          <p style="font-size: 13px; color: #71717a; margin: 0;">Control Center</p>
        </div>

        <!-- Body -->
        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px 0;">
          <strong style="color: #fafafa;">${esc(inviterName)}</strong> invited you to join
          <strong style="color: #fafafa;">${esc(orgName)}</strong> as a
          <strong style="color: #fafafa;">${roleLabel}</strong>.
        </p>

        <!-- Permissions -->
        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="font-size: 13px; font-weight: 600; color: #e4e4e7; margin: 0 0 8px 0;">
            As a ${roleLabel}, you'll be able to:
          </p>
          <ul style="font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
            ${permissions}
          </ul>
        </div>

        <!-- CTA -->
        <a href="${acceptUrl}"
           style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
          Accept Invitation
        </a>

        <!-- Fallback link -->
        <p style="font-size: 12px; color: #52525b; margin-top: 24px; line-height: 1.5;">
          This invitation expires in <strong style="color: #71717a;">48 hours</strong>. If you can't click the button, copy this link:<br/>
          <a href="${acceptUrl}" style="color: #6366f1; word-break: break-all;">${acceptUrl}</a>
        </p>

        <p style="font-size: 12px; color: #3f3f46; margin-top: 12px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>

        <!-- Divider -->
        <div style="height: 1px; background-color: #27272a; margin: 32px 0;"></div>

        <p style="font-size: 11px; color: #3f3f46; margin: 0;">
          Click Studio Control Center &mdash; Project management for creative teams
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: email,
    subject: `${esc(inviterName)} invited you to ${esc(orgName)} on Click Studio`,
    html,
  })
}
