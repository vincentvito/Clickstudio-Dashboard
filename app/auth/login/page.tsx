'use client'

import { useState, useRef, useEffect } from 'react'
import { authClient, useSession } from '@/lib/auth-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandMark } from '@/components/brand-mark'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get('callbackUrl') || '/dashboard'
  const callbackUrl = rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/dashboard'
  const { data: session } = useSession()

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (session) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      })

      if (res.error) {
        setError(res.error.message ?? 'Failed to send code')
      } else {
        setStep('otp')
        setTimeout(() => otpRefs.current[0]?.focus(), 50)
      }
    } catch {
      setError('Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(code: string) {
    setLoading(true)
    setError('')

    try {
      const res = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: code,
      })

      if (res.error) {
        setError(res.error.message ?? 'Invalid code')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      } else {
        router.push(callbackUrl)
      }
    } catch {
      setError('Verification failed')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const next = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 6) next[index + i] = d
      })
      setOtp(next)

      const lastFilled = Math.min(index + digits.length, 5)
      otpRefs.current[lastFilled]?.focus()

      if (next.every((d) => d !== '')) {
        verifyOtp(next.join(''))
      }
      return
    }

    const digit = value.replace(/\D/g, '')
    const next = [...otp]
    next[index] = digit
    setOtp(next)

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    if (next.every((d) => d !== '')) {
      verifyOtp(next.join(''))
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandMark className="size-8 text-primary" />
            <span className="text-lg font-bold">Click Studio</span>
          </Link>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp}>
            <h1 className="mb-1 text-center text-lg font-bold">Sign in</h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Enter your email to receive a login code
            </p>

            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              className="mb-3"
            />

            {error && (
              <p className="mb-3 text-center text-xs text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Send code'
              )}
            </Button>
          </form>
        ) : (
          <div>
            <button
              onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']) }}
              className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3" />
              Back
            </button>

            <h1 className="mb-1 text-lg font-bold">Check your email</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </p>

            {/* OTP inputs */}
            <div className="mb-4 flex justify-center gap-2">
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-10 text-center text-lg font-bold"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <p className="mb-3 text-center text-xs text-destructive">{error}</p>
            )}

            {loading && (
              <div className="flex justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Didn&apos;t receive the code?{' '}
              <button
                onClick={handleSendOtp as () => void}
                className="font-medium text-foreground underline-offset-2 hover:underline"
                disabled={loading}
              >
                Resend
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
