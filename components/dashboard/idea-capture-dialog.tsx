"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Mic, Square, Type } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createIdeaFromAudio, createIdeaFromText } from "@/lib/store"
import { cn } from "@/lib/utils"

const MAX_RECORDING_MS = 180_000 // 3 minutes — keeps payload sane and Gemini fast

interface IdeaCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RecState = "idle" | "recording" | "ready"

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip "data:<mime>;base64," prefix
      const comma = result.indexOf(",")
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

export function IdeaCaptureDialog({ open, onOpenChange }: IdeaCaptureDialogProps) {
  const [tab, setTab] = useState<"type" | "record">("type")
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [recState, setRecState] = useState<RecState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedMime, setRecordedMime] = useState<string>("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  // Object URL for the playback element — recreate on blob change, revoke on cleanup
  useEffect(() => {
    if (!recordedBlob) {
      setAudioUrl(null)
      return
    }
    const url = URL.createObjectURL(recordedBlob)
    setAudioUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recordedBlob])

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const tickRef = useRef<number | null>(null)
  const autoStopRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)

  function cleanupStream() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (autoStopRef.current) {
      window.clearTimeout(autoStopRef.current)
      autoStopRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
  }

  // Reset everything when dialog closes
  useEffect(() => {
    if (open) return
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop()
      } catch {}
    }
    cleanupStream()
    setText("")
    setRecState("idle")
    setElapsed(0)
    setRecordedBlob(null)
    setRecordedMime("")
    setMicError(null)
    setSubmitting(false)
    setTab("type")
  }, [open])

  async function startRecording() {
    setMicError(null)
    setRecordedBlob(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        setRecordedBlob(blob)
        setRecordedMime(type)
        setRecState("ready")
        cleanupStream()
      }

      startedAtRef.current = Date.now()
      setElapsed(0)
      recorder.start()
      setRecState("recording")

      tickRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current)
      }, 200)
      autoStopRef.current = window.setTimeout(() => stopRecording(), MAX_RECORDING_MS)
    } catch (err) {
      const name = err instanceof Error ? err.name : ""
      setMicError(
        name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser to record."
          : "Couldn't access the microphone.",
      )
      cleanupStream()
      setRecState("idle")
    }
  }

  function stopRecording() {
    const r = recorderRef.current
    if (r && r.state !== "inactive") {
      try {
        r.stop()
      } catch {}
    }
  }

  function resetRecording() {
    setRecordedBlob(null)
    setRecordedMime("")
    setElapsed(0)
    setRecState("idle")
  }

  async function submitText() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await createIdeaFromText(text)
      onOpenChange(false)
    } catch {
      setSubmitting(false)
    }
  }

  async function submitAudio() {
    if (!recordedBlob || submitting) return
    setSubmitting(true)
    try {
      const audioBase64 = await blobToBase64(recordedBlob)
      await createIdeaFromAudio(audioBase64, recordedMime || recordedBlob.type || "audio/webm")
      onOpenChange(false)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Drop an idea</DialogTitle>
          <DialogDescription>
            Type it out or record it — we&apos;ll shape it into a clean draft you can promote to a project.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "type" | "record")} className="mt-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="type" className="gap-1.5">
              <Type className="size-3.5" /> Type
            </TabsTrigger>
            <TabsTrigger value="record" className="gap-1.5">
              <Mic className="size-3.5" /> Record
            </TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="mt-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Brain dump the idea: what it is, why it matters. Paste any links inline (https://…) and we'll attach them to the project."
              rows={6}
              autoFocus
              disabled={submitting}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitText()
              }}
            />
            <p className="text-muted-foreground/60 mt-2 text-xs">
              ⌘/Ctrl + Enter to store · links you mention get pulled out automatically
            </p>
          </TabsContent>

          <TabsContent value="record" className="mt-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <button
                type="button"
                onClick={recState === "recording" ? stopRecording : startRecording}
                disabled={submitting || recState === "ready"}
                aria-label={recState === "recording" ? "Stop recording" : "Start recording"}
                className={cn(
                  "relative grid size-20 place-items-center rounded-full text-white transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50",
                  recState === "ready"
                    ? "bg-muted text-muted-foreground"
                    : "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30",
                )}
              >
                {recState === "recording" && (
                  <>
                    <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-500/50" />
                    <span
                      className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-500/40"
                      style={{ animationDelay: "400ms", animationDuration: "1.6s" }}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-500/30"
                      style={{ animationDelay: "800ms", animationDuration: "2s" }}
                    />
                  </>
                )}
                {recState === "idle" && (
                  <span
                    className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-500/25"
                    style={{ animationDuration: "2.4s" }}
                  />
                )}
                <span className="relative z-10 grid place-items-center">
                  {recState === "recording" ? (
                    <Square className="size-7 fill-current" />
                  ) : (
                    <Mic className="size-8" />
                  )}
                </span>
              </button>

              <div className="text-center">
                {recState === "recording" && (
                  <p className="text-foreground text-lg font-medium tabular-nums">
                    {formatElapsed(elapsed)}
                  </p>
                )}
                {recState === "ready" && recordedBlob && (
                  <p className="text-foreground text-sm font-medium tabular-nums">
                    {formatElapsed(elapsed)} recorded
                  </p>
                )}
                {recState === "idle" && (
                  <p className="text-muted-foreground text-sm">
                    {micError ?? "Tap to start recording"}
                  </p>
                )}
                {recState === "idle" && !micError && (
                  <p className="text-muted-foreground/60 mt-1 text-xs">
                    Mention any links out loud — we&apos;ll pull them out.
                  </p>
                )}
                {recState === "recording" && (
                  <p className="text-muted-foreground/70 text-xs">Tap again to stop · max 3 min</p>
                )}
                {recState === "ready" && (
                  <button
                    type="button"
                    onClick={resetRecording}
                    disabled={submitting}
                    className="text-muted-foreground hover:text-foreground mt-1 text-xs underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    Re-record
                  </button>
                )}
              </div>

              {recState === "ready" && audioUrl && (
                <audio
                  src={audioUrl}
                  controls
                  className="w-full"
                  aria-label="Recorded idea playback"
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          {tab === "type" ? (
            <Button onClick={submitText} disabled={!text.trim() || submitting}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {submitting ? "Storing…" : "Store idea"}
            </Button>
          ) : (
            <Button onClick={submitAudio} disabled={!recordedBlob || submitting}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {submitting ? "Storing…" : "Store idea"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
