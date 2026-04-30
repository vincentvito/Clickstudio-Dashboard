export type ProjectState = "Backlog" | "In Build" | "Live" | "Paused"

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
  description: string
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

export type IdeaSource = "Text" | "Voice"
export type IdeaStatus = "Pending" | "Promoted" | "Archived"
export type IdeaNameSearchStatus = "NotStarted" | "Running" | "Completed" | "Failed"

export interface IdeaNameSuggestion {
  id: string
  ideaId: string
  name: string
  domain: string
  rationale: string
  position: number
  createdAt: string
}

export interface Idea {
  id: string
  title: string
  description: string
  links: string
  rawTranscript: string
  source: IdeaSource
  status: IdeaStatus
  nameSearchStatus: IdeaNameSearchStatus
  nameSearchError: string | null
  nameSearchUpdatedAt: string | null
  nameSearchCheckedCount: number
  nameSearchLastDomain: string | null
  nameSuggestions: IdeaNameSuggestion[]
  createdAt: string
  updatedAt: string
  promotedToProjectId: string | null
  promotedToProject: { id: string; title: string } | null
  user?: UserSummary
}

export type NotificationType = "task_assigned" | "note_mention" | "task_mention" | "log_mention"

export interface Notification {
  id: string
  type: NotificationType
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
  userId: string
}
