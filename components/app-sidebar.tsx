"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeftRight,
  Building2,
  ShieldAlert,
  Tags,
  FileText,
  History,
  Bell,
  LogOut,
  Settings,
  User,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const menuItems = [
  {
    title: "Главная",
    items: [
      { title: "Дашборд", href: "/", icon: LayoutDashboard }
    ]
  },
  {
    title: "Данные",
    items: [
      { title: "Клиенты", href: "/clients", icon: Users },
      { title: "Счета", href: "/accounts", icon: CreditCard },
      { title: "Транзакции", href: "/transactions", icon: ArrowLeftRight },
      { title: "Контрагенты", href: "/counterparties", icon: Building2 }
    ]
  },
  {
    title: "Риск-менеджмент",
    items: [
      { title: "Оценки риска", href: "/risk-scores", icon: ShieldAlert },
      { title: "Метки риска", href: "/risk-labels", icon: Tags }
    ]
  },
  {
    title: "Отчётность",
    items: [
      { title: "Отчёты", href: "/reports", icon: FileText },
      { title: "Журнал действий", href: "/activity-logs", icon: History }
    ]
  }
]

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "Analyst":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-green-500/10 text-green-500 border-green-500/20"
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case "Admin":
        return "Администратор"
      case "Analyst":
        return "Аналитик"
      default:
        return "Оператор"
    }
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-orange-600">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white">TransMonitor</span>
          <span className="text-xs text-zinc-500">ML Risk Assessment</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        {menuItems.map((group, i) => (
          <div key={group.title} className={cn("mb-4", i > 0 && "mt-4")}>
            <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {group.title}
            </h4>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-4">
        {session && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-2 hover:bg-zinc-800">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-zinc-800 text-xs">
                    {getInitials(session.user?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-white">
                    {session.user?.name}
                  </span>
                  <Badge variant="outline" className={cn("mt-1 text-[10px] py-0", getRoleBadgeColor(session.user?.role || ""))}>
                    {getRoleName(session.user?.role || "")}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
              <DropdownMenuLabel className="text-zinc-400">Мой аккаунт</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                <User className="mr-2 h-4 w-4" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem 
                className="text-red-400 focus:text-red-400 focus:bg-zinc-800"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
