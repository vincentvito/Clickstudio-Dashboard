"use client"

import { useState, useCallback } from "react"
import { StoreProvider, useStore } from "@/lib/store"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import type { ProjectState } from "@/lib/types"

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { addProject, ready } = useStore()
  const router = useRouter()

  const handleNewProject = useCallback(() => {
    setDialogOpen(true)
  }, [])

  function handleSubmit(data: {
    title: string
    brainDump: string
    artifactLinks: string
    state: ProjectState
  }) {
    const project = addProject(data)
    router.push(`/dashboard/${project.id}`)
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar onNewProject={handleNewProject} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center border-b border-sidebar-border px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </SidebarProvider>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StoreProvider>
      <DashboardShell>{children}</DashboardShell>
    </StoreProvider>
  )
}
