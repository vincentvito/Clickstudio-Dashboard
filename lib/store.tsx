"use client"

import useSWR, { mutate } from "swr"
import type { Project, Task, LogEntry } from "./types"

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
  const { data, error, isLoading } = useSWR<ProjectWithRelations[]>(
    "/api/projects",
    fetcher,
  )

  const allTasks = data?.flatMap((p) => p.tasks) ?? []
  const allLogs = data?.flatMap((p) => p.logs) ?? []

  return {
    projects: data ?? [],
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

function revalidate() {
  mutate((key: string) => typeof key === "string" && key.startsWith("/api/"), undefined, { revalidate: true })
}

export async function createProject(input: {
  title: string
  brainDump: string
  artifactLinks: string
  state: string
}): Promise<Project> {
  const project = await api("/api/projects", "POST", input)
  revalidate()
  return project
}

export async function updateProject(id: string, updates: Partial<Project>) {
  await api(`/api/projects/${id}`, "PATCH", updates)
  revalidate()
}

export async function deleteProject(id: string) {
  await api(`/api/projects/${id}`, "DELETE")
  revalidate()
}

export async function createTask(
  projectId: string,
  input: { title: string; columnId: string; section: string },
): Promise<Task> {
  const task = await api(`/api/projects/${projectId}/tasks`, "POST", input)
  revalidate()
  return task
}

export async function updateTask(id: string, updates: Partial<Task>) {
  await api(`/api/tasks/${id}`, "PATCH", updates)
  revalidate()
}

export async function deleteTask(id: string) {
  await api(`/api/tasks/${id}`, "DELETE")
  revalidate()
}

export async function moveTask(id: string, columnId: string) {
  await api(`/api/tasks/${id}`, "PATCH", { columnId })
  revalidate()
}

export async function createLog(projectId: string, text: string): Promise<LogEntry> {
  const log = await api(`/api/projects/${projectId}/logs`, "POST", { text })
  revalidate()
  return log
}
