"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import type { AppData, Project, Task, LogEntry } from "./types"

const STORAGE_KEY = "clickstudio_v1"

const defaultData: AppData = { projects: [], tasks: [], logs: [] }

function loadData(): AppData {
  if (typeof window === "undefined") return defaultData
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData
    const parsed = JSON.parse(raw)
    return {
      projects: parsed.projects ?? [],
      tasks: (parsed.tasks ?? []).map((t: Task & { status?: string }) => ({
        ...t,
        columnId: t.columnId ?? t.status ?? "todo",
      })),
      logs: parsed.logs ?? [],
    }
  } catch {
    return defaultData
  }
}

function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface StoreContextValue {
  data: AppData
  ready: boolean
  addProject: (project: Omit<Project, "id" | "createdAt">) => Project
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addTask: (task: Omit<Task, "id">) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, columnId: string) => void
  addLog: (projectId: string, text: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData)
  const [ready, setReady] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    setData(loadData())
    setReady(true)
  }, [])

  const persist = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev)
      saveData(next)
      return next
    })
  }, [])

  const addProject = useCallback(
    (input: Omit<Project, "id" | "createdAt">) => {
      const project: Project = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      }
      persist((prev) => ({ ...prev, projects: [...prev.projects, project] }))
      return project
    },
    [persist],
  )

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      persist((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }))
    },
    [persist],
  )

  const deleteProject = useCallback(
    (id: string) => {
      persist((prev) => ({
        projects: prev.projects.filter((p) => p.id !== id),
        tasks: prev.tasks.filter((t) => t.projectId !== id),
        logs: prev.logs.filter((l) => l.projectId !== id),
      }))
    },
    [persist],
  )

  const addTask = useCallback(
    (input: Omit<Task, "id">) => {
      const task: Task = { ...input, id: uid() }
      persist((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
    },
    [persist],
  )

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      persist((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }))
    },
    [persist],
  )

  const deleteTask = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }))
    },
    [persist],
  )

  const moveTask = useCallback(
    (id: string, columnId: string) => {
      persist((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, columnId } : t)),
      }))
    },
    [persist],
  )

  const addLog = useCallback(
    (projectId: string, text: string) => {
      const entry: LogEntry = {
        id: uid(),
        projectId,
        text,
        createdAt: new Date().toISOString(),
      }
      persist((prev) => ({ ...prev, logs: [...prev.logs, entry] }))
    },
    [persist],
  )

  return (
    <StoreContext.Provider
      value={{
        data,
        ready,
        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        addLog,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
