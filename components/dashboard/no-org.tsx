"use client"

import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"
import { signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export function NoOrganization() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/auth/login")
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 inline-flex items-center gap-2">
          <BrandMark className="text-primary size-8" />
          <span className="text-lg font-bold">Click Studio</span>
        </div>

        <h1 className="mb-2 text-lg font-bold">No organization</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          You need an invitation to access Click Studio. Ask your team owner to invite you.
        </p>

        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
