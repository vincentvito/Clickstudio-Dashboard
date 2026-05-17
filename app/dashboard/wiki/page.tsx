"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  BookOpenText,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import {
  createWikiEntry,
  deleteWikiEntry,
  updateWikiEntry,
  useWikiEntries,
} from "@/lib/store"
import { relativeTime } from "@/lib/format"
import { displayName } from "@/lib/user-display"
import type { WikiEntry } from "@/lib/types"

const TITLE_MAX_LENGTH = 300
const TAGS_MAX_LENGTH = 500
const TEXT_MAX_LENGTH = 50 * 1024

type WikiForm = {
  title: string
  links: string
  content: string
  tags: string
}

const EMPTY_FORM: WikiForm = {
  title: "",
  links: "",
  content: "",
  tags: "",
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function hrefFor(value: string) {
  const trimmed = value.trim()
  const compactUrl = trimmed.replace(/\s/g, "")
  if (/^https?:\/\//i.test(compactUrl)) return compactUrl
  if (/^www\./i.test(compactUrl)) return `https://${compactUrl}`
  if (trimmed.startsWith("/")) return trimmed
  return null
}

function matchesSearch(entry: WikiEntry, query: string) {
  if (!query) return true
  return [entry.title, entry.links, entry.content, entry.tags]
    .join("\n")
    .toLowerCase()
    .includes(query)
}

export default function WikiPage() {
  const { entries, isLoading } = useWikiEntries()
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<WikiForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<WikiEntry | null>(null)

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    return entries.filter((entry) => matchesSearch(entry, query))
  }, [entries, search])

  const linkCount = useMemo(
    () => entries.reduce((total, entry) => total + splitLines(entry.links).length, 0),
    [entries],
  )

  function updateField(field: keyof WikiForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function startEditing(entry: WikiEntry) {
    setEditingId(entry.id)
    setForm({
      title: entry.title,
      links: entry.links,
      content: entry.content,
      tags: entry.tags,
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await updateWikiEntry(editingId, form)
      } else {
        await createWikiEntry(form)
      }
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingEntry) return
    await deleteWikiEntry(deletingEntry.id)
    if (editingId === deletingEntry.id) resetForm()
    setDeletingEntry(null)
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied")
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <BookOpenText className="text-primary size-5" />
            <h1 className="text-lg font-bold tracking-tight">Wiki</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Org memory for Click Studio links, paths, agent files, and notes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{entries.length} entries</Badge>
          <Badge variant="outline">{linkCount} links</Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title, notes, links, or tags"
          className="pl-9"
        />
      </div>

      <Card className="gap-4 rounded-lg py-5">
        <form onSubmit={handleSubmit}>
          <CardHeader className="px-4 sm:px-5">
            <CardTitle className="text-base">
              {editingId ? "Edit wiki entry" : "Add wiki entry"}
            </CardTitle>
            <CardDescription>Paste one link or many. Notes and tags stay searchable.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 sm:px-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="grid gap-2 text-sm font-medium">
                Title
                <Input
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  maxLength={TITLE_MAX_LENGTH}
                  placeholder="Agent docs, API references, launch notes..."
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tags
                <Input
                  value={form.tags}
                  onChange={(event) => updateField("tags", event.target.value)}
                  maxLength={TAGS_MAX_LENGTH}
                  placeholder="agents, ops, docs"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Links or paths
              <Textarea
                value={form.links}
                onChange={(event) => updateField("links", event.target.value)}
                maxLength={TEXT_MAX_LENGTH}
                placeholder={"https://example.com\nnotes/you-might-not-need-effect.md"}
                className="min-h-20 font-mono text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Notes
              <Textarea
                value={form.content}
                onChange={(event) => updateField("content", event.target.value)}
                maxLength={TEXT_MAX_LENGTH}
                placeholder="Why this matters, how to use it, related context..."
                className="min-h-28"
              />
            </label>
          </CardContent>
          <CardFooter className="mt-4 flex flex-wrap gap-2 px-4 sm:px-5">
            <Button type="submit" disabled={saving}>
              {editingId ? <Pencil data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              {saving ? "Saving..." : editingId ? "Update entry" : "Add entry"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                <X data-icon="inline-start" />
                Cancel
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="border-border/70 bg-muted/20 rounded-lg border border-dashed px-4 py-14 text-center">
          <p className="text-sm font-medium">
            {entries.length === 0 ? "No wiki entries yet" : "No entries match that search"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {entries.length === 0
              ? "Add the first link, file path, or note above."
              : "Try a project name, tag, URL, or phrase from the notes."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredEntries.map((entry) => (
            <WikiEntryCard
              key={entry.id}
              entry={entry}
              onCopy={copyValue}
              onEdit={startEditing}
              onDelete={setDeletingEntry}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deletingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEntry(null)
        }}
        title="Delete wiki entry"
        description="This will permanently delete this wiki entry."
        onConfirm={handleDelete}
      />
    </div>
  )
}

function WikiEntryCard({
  entry,
  onCopy,
  onEdit,
  onDelete,
}: {
  entry: WikiEntry
  onCopy: (value: string) => void
  onEdit: (entry: WikiEntry) => void
  onDelete: (entry: WikiEntry) => void
}) {
  const links = splitLines(entry.links)
  const tags = splitTags(entry.tags)
  const author = entry.user ? displayName(entry.user) : "Unknown"

  return (
    <Card className="gap-4 rounded-lg py-4">
      <CardHeader className="gap-3 px-4 sm:px-5">
        <div className="min-w-0">
          <CardTitle className="line-clamp-2 text-base leading-snug">{entry.title}</CardTitle>
          <CardDescription className="mt-1">
            Updated {relativeTime(entry.updatedAt)} by {author}
          </CardDescription>
        </div>
        <CardAction className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(entry)} aria-label="Edit">
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry)}
            aria-label="Delete"
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 sm:px-5">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                <Tags />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {entry.content && (
          <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {entry.content}
          </p>
        )}

        {links.length > 0 && (
          <div className="flex flex-col gap-2">
            {links.map((link) => {
              const href = hrefFor(link)
              return (
                <div
                  key={link}
                  className="bg-muted/30 flex min-w-0 items-center gap-2 rounded-md border px-2 py-2"
                >
                  <LinkIcon className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{link}</span>
                  <div className="flex shrink-0 gap-1">
                    {href && (
                      <Button variant="outline" size="xs" asChild>
                        <a
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={href.startsWith("http") ? "noreferrer" : undefined}
                        >
                          <ExternalLink data-icon="inline-start" />
                          Open
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onCopy(link)}
                      aria-label="Copy link or path"
                    >
                      <Copy />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
