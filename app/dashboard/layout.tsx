"use client"

import { useState, useCallback } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { createProject } from "@/lib/store"
import type { ProjectState } from "@/lib/types"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  const handleNewProject = useCallback(() => {
    setDialogOpen(true)
  }, [])

  async function handleSubmit(data: {
    title: string
    brainDump: string
    artifactLinks: string
    state: ProjectState
  }) {
    const project = await createProject(data)
    router.push(`/dashboard/${project.id}`)
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
