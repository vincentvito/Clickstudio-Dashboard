export type ProjectState = "Idea" | "In Build" | "Live" | "Paused"

export type TaskSection = "Product" | "Marketing"

export interface Project {
  id: string
  title: string
  brainDump: string
  artifactLinks: string
  state: ProjectState
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  section: TaskSection
  title: string
  columnId: string
}

export interface LogEntry {
  id: string
  projectId: string
  text: string
  createdAt: string
}

export interface AppData {
  projects: Project[]
  tasks: Task[]
  logs: LogEntry[]
}
