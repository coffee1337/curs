"use client"

import { Bell, Search, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  link?: string
  createdAt: string
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      return res.json()
    },
    refetchInterval: 30000
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }
  })

  const notifications = notificationsData?.notifications || []
  const unreadCount = notificationsData?.unreadCount || 0

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "error":
        return "🔴"
      case "warning":
        return "🟡"
      case "success":
        return "🟢"
      default:
        return "🔵"
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/transactions?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Поиск транзакций..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-700"
          />
        </div>
      </form>

      <div className="flex items-center gap-4">
        {/* Critical Alert Banner */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-400">
              {unreadCount} непрочитанных уведомлений
            </span>
          </div>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-zinc-800">
              <Bell className="h-5 w-5 text-zinc-400" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] bg-red-500 text-white border-0">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800">
            <DropdownMenuLabel className="text-zinc-300">Уведомления</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <ScrollArea className="h-64">
              {notifications.length === 0 ? (
                <div className="py-4 text-center text-sm text-zinc-500">
                  Нет уведомлений
                </div>
              ) : (
                notifications.map((notification: Notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                      notification.isRead ? "opacity-60" : ""
                    }`}
                    onClick={() => {
                      markAsReadMutation.mutate(notification.id)
                      if (notification.link) {
                        router.push(notification.link)
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(notification.type)}</span>
                      <span className="font-medium text-white">{notification.title}</span>
                    </div>
                    <span className="text-xs text-zinc-400 line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(notification.createdAt).toLocaleString("ru-RU")}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
