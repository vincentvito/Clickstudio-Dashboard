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
import { useProjects, useOrgMembers } from "@/lib/store"
import { useSession, signOut } from "@/lib/auth-client"
import { PROJECT_STATE_CONFIG } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Plus,
  LogOut,
  ChevronsUpDown,
  Wrench,
  Users,
  Sparkles,
  Lightbulb,
} from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { APP_VERSION } from "@/lib/changelog"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNewProject: () => void
}

export function AppSidebar({ onNewProject, ...props }: AppSidebarProps) {
  const { projects } = useProjects()
  const { members } = useOrgMembers()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const user = session?.user
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?")
  const currentMember = members.find((m) => m.id === user?.id)
  const isOwnerOrAdmin = currentMember?.role === "owner" || currentMember?.role === "admin"

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
                <div className="text-primary flex aspect-square size-8 items-center justify-center rounded-lg">
                  <BrandMark className="size-8" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">Click Studio</span>
                  <span className="text-muted-foreground truncate text-xs">Control Center</span>
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
                  isActive={pathname === "/dashboard/ideas"}
                  tooltip="Ideas"
                >
                  <Link href="/dashboard/ideas">
                    <Lightbulb />
                    <span>Ideas</span>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/agents")}
                  tooltip="Agents"
                >
                  <Link href="/dashboard/agents">
                    <Sparkles />
                    <span>Agents</span>
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
                <p className="text-muted-foreground px-2 py-3 text-xs group-data-[collapsible=icon]:hidden">
                  No projects yet
                </p>
              )}
              {projects.map((project) => {
                const isActive = pathname === `/dashboard/${project.id}`
                const stateConfig = PROJECT_STATE_CONFIG[project.state]
                const taskCount = (project as any).tasks?.length ?? 0

                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={project.title}>
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
                    {taskCount > 0 && <SidebarMenuBadge>{taskCount}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {isOwnerOrAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/admin"} tooltip="Admin">
                <Link href="/dashboard/admin">
                  <Users />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {/* User menu */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-7">
                    {user?.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate text-xs font-medium">
                      {user?.name || user?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="text-muted-foreground truncate text-[11px]">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
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
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid text-left text-sm leading-tight">
                    <span className="truncate text-xs font-medium">
                      {user?.name || user?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="text-muted-foreground truncate text-[11px]">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/changelog" className="gap-2">
                    <span className="text-muted-foreground text-xs">v{APP_VERSION}</span>
                    <span>Changelog</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive gap-2"
                >
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
