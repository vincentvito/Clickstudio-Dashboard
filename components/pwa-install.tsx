"use client"

import { useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "pwa-install-dismissed-at"
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // a week

export function PwaInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(true) // start hidden until we read storage

  // Defer SW registration so it doesn't compete with hydration.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    const register = () =>
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {})
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(register, { timeout: 3000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = window.setTimeout(register, 1500)
    return () => window.clearTimeout(t)
  }, [])

  // Platform detection + install/appinstalled listeners
  useEffect(() => {
    if (typeof window === "undefined") return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari uses navigator.standalone
      (navigator as unknown as { standalone?: boolean }).standalone === true

    setIsIOS(ios)
    setIsStandalone(standalone)

    // Honor a recent dismissal
    const storedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    setDismissed(Boolean(storedAt) && Date.now() - storedAt < DISMISS_TTL_MS)

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener)

    function onInstalled() {
      setIsStandalone(true)
      setInstallEvent(null)
    }
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === "accepted") {
      setInstallEvent(null)
    } else {
      handleDismiss()
    }
  }

  // Hide if installed, dismissed, or not eligible
  if (isStandalone || dismissed) return null

  // Native (Chrome/Edge/Android) install via beforeinstallprompt
  if (installEvent) {
    return (
      <BannerShell onDismiss={handleDismiss}>
        <div className="flex-1 text-sm">
          <p className="text-foreground font-medium">Install Click Studio</p>
          <p className="text-muted-foreground text-xs">
            Get a one-tap home-screen launcher.
          </p>
        </div>
        <Button size="sm" onClick={handleInstall} className="gap-1.5">
          <Download className="size-3.5" />
          Install
        </Button>
      </BannerShell>
    )
  }

  // iOS Safari — manual instructions
  if (isIOS) {
    return (
      <BannerShell onDismiss={handleDismiss}>
        <div className="flex-1 text-sm">
          <p className="text-foreground font-medium">Add to home screen</p>
          <p className="text-muted-foreground text-xs">
            Tap <Share className="inline size-3 -translate-y-px" /> Share, then{" "}
            <span className="font-medium">Add to Home Screen</span>.
          </p>
        </div>
      </BannerShell>
    )
  }

  return null
}

function BannerShell({
  children,
  onDismiss,
}: {
  children: React.ReactNode
  onDismiss: () => void
}) {
  // Tell the rest of the UI (e.g., the floating Idea button) how tall this
  // banner is so they can lift themselves out of its way.
  useEffect(() => {
    document.body.style.setProperty("--pwa-banner-h", "88px")
    return () => {
      document.body.style.removeProperty("--pwa-banner-h")
    }
  }, [])

  return (
    <div
      style={{ viewTransitionName: "persistent-pwa" }}
      className={cn(
        "fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3",
        "border-border/60 bg-card/95 supports-[backdrop-filter]:bg-card/70 rounded-xl border p-3 shadow-lg backdrop-blur",
      )}
      role="dialog"
      aria-label="Install app"
    >
      {children}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground -mr-1 grid size-7 shrink-0 place-items-center rounded-md transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
