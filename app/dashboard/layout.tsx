"use client"

import { useState, useCallback, useEffect } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { NoOrganization } from "@/components/dashboard/no-org"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { useRouter } from "next/navigation"
import { useSession, authClient } from "@/lib/auth-client"
import { createProject } from "@/lib/store"
import type { ProjectState } from "@/lib/types"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, isPending: sessionPending } = useSession()
  const activeOrg = authClient.useActiveOrganization()
  const orgs = authClient.useListOrganizations()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [orgChecked, setOrgChecked] = useState(false)
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/auth/login")
    }
  }, [session, sessionPending, router])

  // Auto-set active org if user has one but none is active
  useEffect(() => {
    if (session && orgs.data && orgs.data.length > 0 && !activeOrg.data) {
      authClient.organization.setActive({
        organizationId: orgs.data[0].id,
      }).then(() => setOrgChecked(true))
    } else if (session && orgs.data) {
      setOrgChecked(true)
    }
  }, [session, orgs.data, activeOrg.data])

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

  // Loading
  if (sessionPending || !orgChecked) {
    return (
      <div className="flex h-screen">
        <div className="w-[260px] border-r border-sidebar-border p-4 space-y-3">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-8 w-1/2 rounded-lg" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  // Not logged in
  if (!session) return null

  // No organization
  if (!activeOrg.data) {
    return <NoOrganization />
  }

  return (
    <SidebarProvider>
      <AppSidebar onNewProject={handleNewProject} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <SidebarTrigger className="-ml-1" />
          <ThemeToggle />
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
