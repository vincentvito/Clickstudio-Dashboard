export type ProjectState = "Idea" | "In Build" | "Live" | "Paused"

export type TaskSection = "Product" | "Marketing"

export interface UserSummary {
  id: string
  name: string | null
  email: string
  image: string | null
}

export interface Project {
  id: string
  title: string
  brainDump: string
  artifactLinks: string
  state: ProjectState
  createdAt: string
  user?: UserSummary
}

export interface Task {
  id: string
  projectId: string
  section: TaskSection
  title: string
  columnId: string
  assignees: UserSummary[]
}

export interface LogEntry {
  id: string
  projectId: string
  text: string
  createdAt: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  authorId: string
  author?: UserSummary
}

export interface AppData {
  projects: Project[]
  tasks: Task[]
  logs: LogEntry[]
}
