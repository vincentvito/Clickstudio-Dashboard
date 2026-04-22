"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import { Loader2 } from "lucide-react"
import type { LogEntry } from "@/lib/types"
import { MentionInput } from "./mention-input"
import { MentionRenderer } from "./mention-renderer"

interface DailyLogProps {
  logs: LogEntry[]
  onAdd: (text: string) => void | Promise<void>
  isLoading?: boolean
}

export function DailyLog({ logs, onAdd, isLoading }: DailyLogProps) {
  const [message, setMessage] = useState("")
  const [posting, setPosting] = useState(false)

  async function submit() {
    if (!message.trim() || posting) return
    setPosting(true)
    try {
      await onAdd(message.trim())
      setMessage("")
    } finally {
      setPosting(false)
    }
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <MentionInput
          value={message}
          onChange={setMessage}
          onSubmit={submit}
          placeholder="Quick update — use @ to mention teammates"
          className="text-sm"
          disabled={posting}
        />
        <Button
          onClick={submit}
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={posting || !message.trim()}
        >
          {posting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Posting
            </>
          ) : (
            "Post"
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No updates yet — post one above
        </p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((log) => (
            <div key={log.id} className="border-border/50 bg-card flex gap-3 rounded-lg border p-3">
              <div className="bg-primary w-0.5 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm leading-relaxed">
                  <MentionRenderer content={log.text} />
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {formatDate(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
