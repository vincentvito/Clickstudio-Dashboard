"use client"

import { useState, useCallback, useEffect } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { IdeaFloatingButton } from "@/components/dashboard/idea-floating-button"
import { NoOrganization } from "@/components/dashboard/no-org"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { NotificationsBell } from "@/components/dashboard/notifications-bell"
import { useRouter } from "next/navigation"
import { useSession, authClient } from "@/lib/auth-client"
import { createProject } from "@/lib/store"
import type { ProjectState } from "@/lib/types"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession()
  const {
    data: activeOrganization,
    isPending: activeOrganizationPending,
    refetch: refetchActiveOrganization,
  } = authClient.useActiveOrganization()
  const { data: organizations, isPending: organizationsPending } = authClient.useListOrganizations()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [orgChecked, setOrgChecked] = useState(false)
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/auth/login")
    }
  }, [session, sessionPending, router])

  // Auto-set active org if user has one but none is active
  useEffect(() => {
    let cancelled = false

    async function ensureActiveOrganization() {
      if (!session || organizationsPending || activeOrganizationPending) return

      if (activeOrganization) {
        setOrgChecked(true)
        return
      }

      const firstOrganization = organizations?.[0]
      if (!firstOrganization) {
        setOrgChecked(true)
        return
      }

      try {
        const result = await authClient.organization.setActive({
          organizationId: firstOrganization.id,
        })

        if (result.error) {
          console.error("Failed to set active organization", result.error)
          return
        }

        await refetchActiveOrganization()
      } catch (error) {
        console.error("Failed to set active organization", error)
      } finally {
        if (!cancelled) {
          setOrgChecked(true)
        }
      }
    }

    ensureActiveOrganization()

    return () => {
      cancelled = true
    }
  }, [
    activeOrganization,
    activeOrganizationPending,
    organizations,
    organizationsPending,
    refetchActiveOrganization,
    session,
  ])

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
  if (sessionPending || (session && !orgChecked)) {
    return (
      <div className="flex h-screen">
        <div className="border-sidebar-border w-[260px] space-y-3 border-r p-4">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-8 w-1/2 rounded-lg" />
        </div>
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  // Not logged in
  if (!session) return null

  // No organization
  if (!activeOrganization) {
    return <NoOrganization />
  }

  return (
    <SidebarProvider>
      <AppSidebar onNewProject={handleNewProject} />
      <SidebarInset>
        <header
          style={{ viewTransitionName: "persistent-header" }}
          className="border-sidebar-border bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b px-4 backdrop-blur"
        >
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>

      <ProjectFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} />
      <IdeaFloatingButton />
    </SidebarProvider>
  )
}
