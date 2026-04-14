import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP } from 'better-auth/plugins'
import { organization } from 'better-auth/plugins'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ac, owner, admin, member } from '@/lib/permissions'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === 'sign-in'
            ? 'Your Click Studio login code'
            : type === 'email-verification'
              ? 'Verify your Click Studio email'
              : 'Reset your Click Studio password'

        const actionText =
          type === 'sign-in'
            ? 'Use this code to sign in to your account:'
            : type === 'email-verification'
              ? 'Use this code to verify your email address:'
              : 'Use this code to reset your password:'

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
                ${actionText}
              </p>

              <!-- OTP Code -->
              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #fafafa; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;">
                  ${otp}
                </div>
              </div>

              <!-- Footer -->
              <p style="font-size: 13px; color: #52525b; line-height: 1.5; margin: 0 0 8px 0;">
                This code expires in <strong style="color: #71717a;">5 minutes</strong>.
              </p>
              <p style="font-size: 13px; color: #3f3f46; line-height: 1.5; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>

              <!-- Divider -->
              <div style="height: 1px; background-color: #27272a; margin: 32px 0;"></div>

              <p style="font-size: 11px; color: #3f3f46; margin: 0;">
                Click Studio Control Center &mdash; Project management for creative teams
              </p>
            </div>
          </div>
        `

        await sendEmail({ to: email, subject, html })
      },
      otpLength: 6,
      expiresIn: 300,
    }),
    organization({
      ac,
      roles: { owner, admin, member },
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      invitationExpiresIn: 60 * 60 * 48, // 48 hours
    }),
  ],
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  ],
})
