"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useProjects } from "@/lib/store"
import { useSession, signOut } from "@/lib/auth-client"
import { PROJECT_STATE_CONFIG } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Plus, LogOut, ChevronsUpDown, Settings, Wrench } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { APP_VERSION } from "@/lib/changelog"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNewProject: () => void
}

export function AppSidebar({ onNewProject, ...props }: AppSidebarProps) {
  const { projects } = useProjects()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const user = session?.user
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?"

  async function handleSignOut() {
    await signOut()
    router.push("/auth/login")
  }

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
                  <span className="truncate font-bold">Click Studio</span>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/tools"}
                  tooltip="Tools"
                >
                  <Link href="/dashboard/tools">
                    <Wrench />
                    <span>Tools</span>
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
                const taskCount = (project as any).tasks?.length ?? 0

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
          {/* User menu */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-7">
                    {user?.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate text-xs font-medium">
                      {user?.name || user?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Avatar className="size-7">
                    {user?.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid text-left text-sm leading-tight">
                    <span className="truncate text-xs font-medium">
                      {user?.name || user?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/changelog" className="gap-2">
                    <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
                    <span>Changelog</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="gap-2">
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
