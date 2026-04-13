"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { useProjects } from "@/lib/store"
import { PROJECT_STATE_CONFIG } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Plus } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { APP_VERSION } from "@/lib/changelog"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNewProject: () => void
}

export function AppSidebar({ onNewProject, ...props }: AppSidebarProps) {
  const { projects, tasks } = useProjects()
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-primary">
                  <BrandMark className="size-8" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">Clickstudio</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Control Center
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Actions */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <Button size="sm" className="w-full gap-1.5" onClick={onNewProject}>
              <Plus className="size-3.5" />
              New project
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  tooltip="All projects"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>All projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Project list */}
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No projects yet
                </p>
              )}
              {projects.map((project) => {
                const isActive = pathname === `/dashboard/${project.id}`
                const stateConfig = PROJECT_STATE_CONFIG[project.state]
                const taskCount = tasks.filter(
                  (t) => t.projectId === project.id,
                ).length

                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={project.title}
                    >
                      <Link href={`/dashboard/${project.id}`}>
                        <span
                          className={cn(
                            "size-2 shrink-0 rotate-45 rounded-sm",
                            stateConfig.color.replace("text-", "bg-"),
                          )}
                        />
                        <span>{project.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {taskCount > 0 && (
                      <SidebarMenuBadge>{taskCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:justify-center">
              <Link
                href="/changelog"
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground group-data-[collapsible=icon]:hidden"
              >
                v{APP_VERSION}
              </Link>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
