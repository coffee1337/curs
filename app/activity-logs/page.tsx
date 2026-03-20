"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { History, Download, User, Edit, Trash2, Plus, Eye, LogIn, LogOut, FileDown } from "lucide-react"
import { formatDate, cn, downloadCSV } from "@/lib/utils"

const actionIcons: Record<string, any> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  VIEW: Eye,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  EXPORT: FileDown
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-500/10 text-green-500 border-green-500/20",
  UPDATE: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  VIEW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  LOGIN: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  LOGOUT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  EXPORT: "bg-orange-500/10 text-orange-500 border-orange-500/20"
}

export default function ActivityLogsPage() {
  const { data: session, status } = useSession()
  const [actionFilter, setActionFilter] = useState("all")
  const [entityTypeFilter, setEntityTypeFilter] = useState("all")

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-logs", actionFilter, entityTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (actionFilter !== "all") params.append("action", actionFilter)
      if (entityTypeFilter !== "all") params.append("entityType", entityTypeFilter)
      const res = await fetch(`/api/activity-logs?${params}`)
      return res.json()
    }
  })

  const handleExport = () => {
    if (!logs?.length) return
    const data = logs.map((l: any) => ({
      ID: l.id, Действие: l.action, "Тип сущности": l.entityType, "ID сущности": l.entityId || "",
      Пользователь: l.user?.name, Детали: l.details || "", "IP-адрес": l.ipAddress || "", Дата: formatDate(l.createdAt)
    }))
    downloadCSV(data, "activity-logs")
    toast.success("Данные экспортированы")
  }

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center bg-zinc-950"><div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-red-500" /></div>
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Журнал действий</h1>
                <p className="text-zinc-400 mt-1">История всех действий пользователей в системе</p>
              </div>
              <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />Экспорт
              </Button>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Действие" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все действия</SelectItem>
                      <SelectItem value="CREATE">Создание</SelectItem>
                      <SelectItem value="UPDATE">Обновление</SelectItem>
                      <SelectItem value="DELETE">Удаление</SelectItem>
                      <SelectItem value="VIEW">Просмотр</SelectItem>
                      <SelectItem value="LOGIN">Вход</SelectItem>
                      <SelectItem value="LOGOUT">Выход</SelectItem>
                      <SelectItem value="EXPORT">Экспорт</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Сущность" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все сущности</SelectItem>
                      <SelectItem value="Client">Клиент</SelectItem>
                      <SelectItem value="Account">Счёт</SelectItem>
                      <SelectItem value="Transaction">Транзакция</SelectItem>
                      <SelectItem value="Counterparty">Контрагент</SelectItem>
                      <SelectItem value="RiskScore">Оценка риска</SelectItem>
                      <SelectItem value="RiskLabel">Метка риска</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-zinc-800" />)}</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Дата</TableHead>
                      <TableHead className="text-zinc-400">Пользователь</TableHead>
                      <TableHead className="text-zinc-400">Действие</TableHead>
                      <TableHead className="text-zinc-400">Сущность</TableHead>
                      <TableHead className="text-zinc-400">Детали</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {logs?.map((log: any) => {
                        const Icon = actionIcons[log.action] || History
                        return (
                          <TableRow key={log.id} className="border-zinc-800">
                            <TableCell className="text-zinc-300 text-sm">{formatDate(log.createdAt)}</TableCell>
                            <TableCell className="text-white">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                  <User className="h-4 w-4 text-zinc-400" />
                                </div>
                                <div>
                                  <p className="font-medium">{log.user?.name}</p>
                                  <p className="text-zinc-500 text-xs">{log.user?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("border", actionColors[log.action] || "bg-zinc-500/10 text-zinc-400")}>
                                <Icon className="h-3 w-3 mr-1" />
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-zinc-300">
                              <span className="text-zinc-400">{log.entityType}</span>
                              {log.entityId && <span className="ml-1">#{log.entityId}</span>}
                            </TableCell>
                            <TableCell className="text-zinc-400 text-sm max-w-md truncate">{log.details || "-"}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
