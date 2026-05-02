"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { displayName } from "@/lib/user-display"

export interface MentionItem {
  id: string
  name: string | null
  email: string
  image: string | null
  isAgent?: boolean
}

interface MentionListProps {
  items: MentionItem[]
  command: (attrs: { id: string; label: string }) => void
}

export const MentionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  MentionListProps
>(function MentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) {
      command({ id: item.id, label: item.name || item.email.split("@")[0] })
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="border-border bg-popover text-muted-foreground w-64 rounded-md border p-2 text-xs shadow-md">
        No members found
      </div>
    )
  }

  return (
    <div className="border-border bg-popover w-64 overflow-hidden rounded-md border p-1 shadow-md">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => selectItem(index)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={cn(
            "text-popover-foreground flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
            index === selectedIndex && "bg-accent text-accent-foreground",
          )}
        >
          <Avatar className="size-5">
            {item.image && <AvatarImage src={item.image} />}
            <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
              {(item.name?.[0] || item.email[0]).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate">{displayName(item)}</span>
        </button>
      ))}
    </div>
  )
})
