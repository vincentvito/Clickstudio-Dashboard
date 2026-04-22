"use client"

import { useMemo } from "react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import type { Project, Task, LogEntry, Note, UserSummary, Notification } from "./types"

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
  })

// ─── Projects list ──────────────────────────────────────

type ProjectWithRelations = Project & {
  tasks: Task[]
  logs: LogEntry[]
}

export function useProjects() {
  const { data, error, isLoading } = useSWR<ProjectWithRelations[]>("/api/projects", fetcher)

  const projects = data ?? []
  const allTasks = useMemo(() => projects.flatMap((p) => p.tasks), [projects])
  const allLogs = useMemo(() => projects.flatMap((p) => p.logs), [projects])

  return {
    projects,
    tasks: allTasks,
    logs: allLogs,
    isLoading,
    error,
  }
}

// ─── Single project ─────────────────────────────────────

export function useProject(projectId: string) {
  const { data, error, isLoading } = useSWR<ProjectWithRelations>(
    `/api/projects/${projectId}`,
    fetcher,
  )

  return {
    project: data ?? null,
    tasks: data?.tasks ?? [],
    logs: data?.logs ?? [],
    isLoading,
    error,
  }
}

// ─── Mutations ──────────────────────────────────────────

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(err.error ?? "Request failed")
  }
  return res.json()
}

function revalidateAll() {
  mutate((key: string) => typeof key === "string" && key.startsWith("/api/"), undefined, {
    revalidate: true,
  })
}

function revalidateProject(projectId?: string) {
  if (projectId) {
    mutate(`/api/projects/${projectId}`)
  }
  mutate("/api/projects")
}

export async function createProject(input: {
  title: string
  brainDump: string
  artifactLinks: string
  state: string
}): Promise<Project> {
  try {
    const project = await api("/api/projects", "POST", input)
    revalidateAll()
    toast.success("Project created")
    return project
  } catch (e: any) {
    toast.error(e.message ?? "Failed to create project")
    throw e
  }
}

export async function updateProject(id: string, updates: Partial<Project>) {
  try {
    await api(`/api/projects/${id}`, "PATCH", updates)
    revalidateAll()
    toast.success("Project updated")
  } catch (e: any) {
    toast.error(e.message ?? "Failed to update project")
    throw e
  }
}

export async function deleteProject(id: string) {
  try {
    await api(`/api/projects/${id}`, "DELETE")
    revalidateAll()
    toast.success("Project deleted")
  } catch (e: any) {
    toast.error(e.message ?? "Failed to delete project")
    throw e
  }
}

export async function createTask(
  projectId: string,
  input: { title: string; columnId: string; section: string; assigneeIds?: string[] },
): Promise<Task> {
  try {
    const task = await api(`/api/projects/${projectId}/tasks`, "POST", input)
    revalidateProject(projectId)
    return task
  } catch (e: any) {
    toast.error(e.message ?? "Failed to create task")
    throw e
  }
}

export async function updateTask(id: string, updates: Partial<Task>) {
  try {
    const updated = await api(`/api/tasks/${id}`, "PATCH", updates)
    revalidateProject(updated.projectId)
  } catch (e: any) {
    toast.error(e.message ?? "Failed to update task")
    throw e
  }
}

export async function deleteTask(id: string) {
  try {
    await api(`/api/tasks/${id}`, "DELETE")
    revalidateAll()
    toast.success("Task deleted")
  } catch (e: any) {
    toast.error(e.message ?? "Failed to delete task")
    throw e
  }
}

export async function moveTask(id: string, columnId: string, projectId?: string) {
  // Optimistic update: immediately patch the cache before the API call
  if (projectId) {
    mutate(
      `/api/projects/${projectId}`,
      (current: any) => {
        if (!current) return current
        return {
          ...current,
          tasks: current.tasks.map((t: Task) => (t.id === id ? { ...t, columnId } : t)),
        }
      },
      { revalidate: false },
    )
  }

  try {
    const updated = await api(`/api/tasks/${id}`, "PATCH", { columnId })
    revalidateProject(updated.projectId)
  } catch (e: any) {
    // Rollback by revalidating
    if (projectId) revalidateProject(projectId)
    toast.error(e.message ?? "Failed to move task")
    throw e
  }
}

export async function createLog(projectId: string, text: string): Promise<LogEntry> {
  try {
    const log = await api(`/api/projects/${projectId}/logs`, "POST", { text })
    revalidateProject(projectId)
    return log
  } catch (e: any) {
    toast.error(e.message ?? "Failed to post update")
    throw e
  }
}

// ─── Members ────────────────────────────────────────────

export function useOrgMembers() {
  const { data, isLoading } = useSWR<(UserSummary & { role: string })[]>(
    "/api/org/members/list",
    fetcher,
  )
  return { members: data ?? [], isLoading }
}

// ─── Notes ──────────────────────────────────────────────

export function useNotes(projectId: string) {
  const { data, isLoading } = useSWR<Note[]>(`/api/projects/${projectId}/notes`, fetcher)
  return { notes: data ?? [], isLoading }
}

export async function createNote(
  projectId: string,
  input: { title?: string; content?: string },
): Promise<Note> {
  try {
    const note = await api(`/api/projects/${projectId}/notes`, "POST", input)
    // Don't revalidate -- we immediately open the note for editing
    // List refreshes when user navigates back
    return note
  } catch (e: any) {
    toast.error(e.message ?? "Failed to create note")
    throw e
  }
}

export async function updateNote(id: string, updates: Partial<Note>) {
  try {
    await api(`/api/notes/${id}`, "PATCH", updates)
    // Don't revalidate on note updates -- auto-save would cause UI flicker
    // The notes list will refresh when navigating back
  } catch (e: any) {
    toast.error(e.message ?? "Failed to update note")
    throw e
  }
}

export async function deleteNote(id: string) {
  try {
    await api(`/api/notes/${id}`, "DELETE")
    revalidateAll()
    toast.success("Note deleted")
  } catch (e: any) {
    toast.error(e.message ?? "Failed to delete note")
    throw e
  }
}

// ─── Notifications ──────────────────────────────────────

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

export function useNotifications() {
  const { data, isLoading } = useSWR<NotificationsResponse>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 30000 }, // poll every 30s
  )
  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
  }
}

export async function markNotificationRead(id: string) {
  try {
    await api(`/api/notifications/${id}`, "PATCH")
    mutate("/api/notifications")
  } catch {
    // silent
  }
}

export async function markAllNotificationsRead() {
  try {
    await api("/api/notifications/mark-all-read", "POST")
    mutate("/api/notifications")
  } catch {
    // silent
  }
}

export async function clearAllNotifications() {
  try {
    await api("/api/notifications/clear-all", "POST")
    mutate("/api/notifications")
  } catch {
    toast.error("Failed to clear notifications")
  }
}
