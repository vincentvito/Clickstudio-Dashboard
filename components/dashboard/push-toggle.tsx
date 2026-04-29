"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type State = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed"

export function PushToggle() {
  const [state, setState] = useState<State>("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC) {
      setState("unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setState("denied")
      return
    }
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setState(sub ? "subscribed" : "unsubscribed")
      } catch {
        setState("unsubscribed")
      }
    })()
  }, [])

  async function enable() {
    if (busy || !VAPID_PUBLIC) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "unsubscribed")
        toast.error("Notifications permission denied")
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
      const json = sub.toJSON()
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setState("subscribed")
      toast.success("Notifications enabled")
    } catch (e) {
      console.error(e)
      toast.error("Couldn't enable notifications")
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (busy) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
      }
      setState("unsubscribed")
      toast.success("Notifications disabled")
    } catch (e) {
      console.error(e)
      toast.error("Couldn't disable notifications")
    } finally {
      setBusy(false)
    }
  }

  if (state === "loading" || state === "unsupported") return null

  if (state === "denied") {
    return (
      <p className="text-muted-foreground/70 text-[11px]">
        Notifications blocked in browser settings
      </p>
    )
  }

  const subscribed = state === "subscribed"
  return (
    <button
      type="button"
      onClick={subscribed ? disable : enable}
      disabled={busy}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[11px] transition-colors",
        busy && "cursor-wait opacity-60",
      )}
    >
      {busy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : subscribed ? (
        <BellOff className="size-3" />
      ) : (
        <Bell className="size-3" />
      )}
      {subscribed ? "Push on" : "Enable push"}
    </button>
  )
}
