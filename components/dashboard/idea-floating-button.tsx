"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Lightbulb } from "lucide-react"

// Lazy-load the dialog (and its MediaRecorder/audio plumbing) only when the
// user actually opens it. Saves the audio code from the initial dashboard JS.
const IdeaCaptureDialog = dynamic(
  () => import("./idea-capture-dialog").then((m) => ({ default: m.IdeaCaptureDialog })),
  { ssr: false },
)

export function IdeaFloatingButton() {
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  function handleOpen() {
    setHasOpened(true)
    setOpen(true)
  }

  // Warm the chunk on hover/focus so the first open feels instant
  function preload() {
    if (hasOpened) return
    void import("./idea-capture-dialog")
  }

  return (
    <>
      <div
        className="fixed right-6 z-50 transition-[bottom] duration-200"
        style={{
          bottom: "calc(1.5rem + var(--pwa-banner-h, 0px))",
          viewTransitionName: "persistent-fab",
        }}
      >
        {/* Soft animated glow behind the button */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-yellow-400/80 blur-2xl dark:bg-yellow-300/70"
        />
        <button
          type="button"
          onClick={handleOpen}
          onPointerEnter={preload}
          onFocus={preload}
          aria-label="Drop idea"
          className="group relative inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-3 text-sm font-semibold text-yellow-950 shadow-lg shadow-yellow-500/40 ring-1 ring-yellow-300 transition-all hover:scale-[1.04] hover:bg-yellow-300 hover:shadow-yellow-500/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-yellow-300 dark:text-yellow-950 dark:shadow-yellow-400/40 dark:hover:bg-yellow-200 dark:hover:shadow-yellow-400/60"
        >
          <Lightbulb className="size-4 transition-transform group-hover:rotate-[-8deg]" />
          Idea
        </button>
      </div>
      {hasOpened && <IdeaCaptureDialog open={open} onOpenChange={setOpen} />}
    </>
  )
}
