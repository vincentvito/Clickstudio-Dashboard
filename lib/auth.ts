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

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="font-size: 20px; font-weight: 700; color: #111; margin-bottom: 8px;">
              Click Studio Control Center
            </h2>
            <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
              ${type === 'sign-in' ? 'Enter this code to sign in:' : type === 'email-verification' ? 'Enter this code to verify your email:' : 'Enter this code to reset your password:'}
            </p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111; background: #f5f5f5; padding: 16px 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
              ${otp}
            </div>
            <p style="font-size: 13px; color: #999;">
              This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.
            </p>
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
