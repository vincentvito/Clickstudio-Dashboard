"use client"

import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from "@/lib/store"
import { relativeTime } from "@/lib/format"
import type { Notification } from "@/lib/types"

export function NotificationsBell() {
  const { notifications, unreadCount } = useNotifications()
  const router = useRouter()

  async function handleClick(n: Notification) {
    if (!n.isRead) {
      await markNotificationRead(n.id)
    }
    if (n.link) {
      router.push(n.link)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-red-500" />
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="border-border/50 flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                {unreadCount}
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
              >
                <CheckCheck className="size-3" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => clearAllNotifications()}
                className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-[11px] transition-colors"
              >
                <Trash2 className="size-3" />
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="hover:bg-accent/50 flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors"
              >
                {!n.isRead && <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />}
                {n.isRead && <span className="mt-1.5 size-1.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs leading-relaxed ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {n.message}
                  </p>
                  <p className="text-muted-foreground/60 mt-0.5 text-[10px]">
                    {relativeTime(n.createdAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
