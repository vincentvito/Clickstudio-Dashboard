"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/format"
import type { LogEntry } from "@/lib/types"

interface DailyLogProps {
  logs: LogEntry[]
  onAdd: (text: string) => void
}

export function DailyLog({ logs, onAdd }: DailyLogProps) {
  const [message, setMessage] = useState("")

  function submit() {
    if (!message.trim()) return
    onAdd(message.trim())
    setMessage("")
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Quick update — what happened today?"
          className="text-sm"
        />
        <Button onClick={submit} size="sm" className="shrink-0">
          Post
        </Button>
      </div>

      {sorted.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No updates yet — post one above
        </p>
      )}

      <div className="space-y-1.5">
        {sorted.map((log) => (
          <div key={log.id} className="border-border/50 bg-card flex gap-3 rounded-lg border p-3">
            <div className="bg-primary w-0.5 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm leading-relaxed">{log.text}</p>
              <p className="text-muted-foreground mt-1 text-[11px]">{formatDate(log.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
