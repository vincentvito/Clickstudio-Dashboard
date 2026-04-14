"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function AcceptInvitePage() {
  const params = useParams<{ invitationId: string }>()
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [status, setStatus] = useState<"loading" | "login" | "accepting" | "success" | "error">(
    "loading",
  )
  const [error, setError] = useState("")

  useEffect(() => {
    if (isPending) return

    if (!session) {
      // Not logged in -- redirect to login with callback
      setStatus("login")
      return
    }

    // Logged in -- accept the invitation
    acceptInvitation()
  }, [session, isPending])

  async function acceptInvitation() {
    setStatus("accepting")
    try {
      const res = await authClient.organization.acceptInvitation({
        invitationId: params.invitationId,
      })

      if (res.error) {
        setError(res.error.message ?? "Failed to accept invitation")
        setStatus("error")
        return
      }

      // Set the org as active
      if (res.data?.member?.organizationId) {
        await authClient.organization.setActive({
          organizationId: res.data.member.organizationId,
        })
      }

      setStatus("success")
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch {
      setError("Failed to accept invitation")
      setStatus("error")
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 inline-flex items-center gap-2">
          <BrandMark className="text-primary size-8" />
          <span className="text-lg font-bold">Click Studio</span>
        </div>

        {status === "loading" && (
          <div className="flex justify-center">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        )}

        {status === "login" && (
          <>
            <h1 className="mb-2 text-lg font-bold">Sign in to accept</h1>
            <p className="text-muted-foreground mb-6 text-sm">
              You need to sign in before joining the organization.
            </p>
            <Button asChild>
              <Link href={`/auth/login?callbackUrl=/auth/invite/${params.invitationId}`}>
                Sign in
              </Link>
            </Button>
          </>
        )}

        {status === "accepting" && (
          <>
            <Loader2 className="text-muted-foreground mx-auto mb-3 size-5 animate-spin" />
            <p className="text-muted-foreground text-sm">Accepting invitation...</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="mb-2 text-lg font-bold">You're in!</h1>
            <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="mb-2 text-lg font-bold">Something went wrong</h1>
            <p className="text-muted-foreground mb-6 text-sm">{error}</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
