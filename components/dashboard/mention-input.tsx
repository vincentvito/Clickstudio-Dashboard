"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useOrgMembers } from "@/lib/store"
import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<typeof Input>

interface MentionInputProps extends Omit<InputProps, "value" | "onChange" | "onKeyDown"> {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
}

export const MentionInput = forwardRef<HTMLInputElement, MentionInputProps>(function MentionInput(
  { value, onChange, onSubmit, className, disabled, ...rest },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, [])

  const { members } = useOrgMembers()
  const [query, setQuery] = useState<string | null>(null)
  const [triggerStart, setTriggerStart] = useState(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const candidates =
    query === null
      ? []
      : members
          .filter(
            (m) =>
              (m.name?.toLowerCase() ?? "").includes(query.toLowerCase()) ||
              m.email.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 5)

  function detectTrigger(nextValue: string, cursor: number) {
    const upTo = nextValue.slice(0, cursor)
    const match = upTo.match(/(?:^|\s)@([\w.\-]*)$/)
    if (match) {
      setQuery(match[1])
      setTriggerStart(cursor - match[1].length - 1)
      setSelectedIndex(0)
    } else {
      setQuery(null)
      setTriggerStart(-1)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    onChange(next)
    detectTrigger(next, e.target.selectionStart ?? next.length)
  }

  function insertMention(member: (typeof members)[number]) {
    if (triggerStart < 0) return
    const cursor = inputRef.current?.selectionStart ?? value.length
    const label = member.name || member.email.split("@")[0]
    const token = `@[${label}](${member.id}) `
    const next = value.slice(0, triggerStart) + token + value.slice(cursor)
    onChange(next)
    setQuery(null)
    setTriggerStart(-1)
    const pos = triggerStart + token.length
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(pos, pos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (query !== null && candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % candidates.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => (i + candidates.length - 1) % candidates.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(candidates[selectedIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setQuery(null)
        return
      }
    }
    if (e.key === "Enter" && onSubmit) {
      onSubmit()
    }
  }

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
        disabled={disabled}
        className={className}
        {...rest}
      />
      {query !== null && candidates.length > 0 && (
        <div className="border-border bg-popover absolute top-full left-0 z-50 mt-1 w-64 overflow-hidden rounded-md border p-1 shadow-md">
          {candidates.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(item)
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn(
                "text-popover-foreground flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
                i === selectedIndex && "bg-accent text-accent-foreground",
              )}
            >
              <Avatar className="size-5">
                {item.image && <AvatarImage src={item.image} />}
                <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                  {(item.name?.[0] || item.email[0]).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{item.name || item.email.split("@")[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
