"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  CreditCard,
  UserX,
  RefreshCw,
  Download,
} from "lucide-react"
import { formatDate, formatDateShort, getRiskColor, getRiskProgressColor, cn, downloadCSV } from "@/lib/utils"

interface Client {
  id: number
  fullName: string
  phone: string
  email: string | null
  passportSeries: string
  passportNumber: string
  dateOfBirth: string
  registrationDate: string
  isBlocked: boolean
  scoringScore: number
  accounts?: { id: number }[]
}

export default function ClientsPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [isBlockedFilter, setIsBlockedFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    passportSeries: "",
    passportNumber: "",
    dateOfBirth: "",
    isBlocked: false,
    scoringScore: 0.5
  })

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", search, isBlockedFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (isBlockedFilter !== "all") params.append("isBlocked", isBlockedFilter)
      const res = await fetch(`/api/clients?${params}`)
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Ошибка создания")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      toast.success("Клиент успешно создан")
      resetForm()
      setIsDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Ошибка обновления")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      toast.success("Клиент успешно обновлён")
      resetForm()
      setIsDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE"
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Ошибка удаления")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      toast.success("Клиент успешно удалён")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const resetForm = () => {
    setFormData({
      fullName: "",
      phone: "",
      email: "",
      passportSeries: "",
      passportNumber: "",
      dateOfBirth: "",
      isBlocked: false,
      scoringScore: 0.5
    })
    setEditingClient(null)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      fullName: client.fullName,
      phone: client.phone,
      email: client.email || "",
      passportSeries: client.passportSeries,
      passportNumber: client.passportNumber,
      dateOfBirth: new Date(client.dateOfBirth).toISOString().split("T")[0],
      isBlocked: client.isBlocked,
      scoringScore: client.scoringScore
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleExport = () => {
    if (!clients || clients.length === 0) return
    const exportData = clients.map((c: Client) => ({
      ID: c.id,
      ФИО: c.fullName,
      Телефон: c.phone,
      Email: c.email || "",
      Паспорт: `${c.passportSeries} ${c.passportNumber}`,
      "Дата рождения": formatDateShort(c.dateOfBirth),
      "Дата регистрации": formatDateShort(c.registrationDate),
      Заблокирован: c.isBlocked ? "Да" : "Нет",
      "Риск-скор": (c.scoringScore * 100).toFixed(0) + "%",
      "Кол-во счетов": c.accounts?.length || 0
    }))
    downloadCSV(exportData, "clients")
    toast.success("Данные экспортированы")
  }

  const canEdit = session?.user?.role !== "Operator"
  const canDelete = session?.user?.role === "Admin"

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
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Клиенты</h1>
                <p className="text-zinc-400 mt-1">Управление клиентами системы</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт CSV
                </Button>
                {canEdit && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить клиента
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingClient ? "Редактировать клиента" : "Новый клиент"}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                          {editingClient ? "Обновите данные клиента" : "Введите данные нового клиента"}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-300">ФИО</Label>
                          <Input
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Телефон</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="+79991234567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Серия паспорта</Label>
                            <Input
                              value={formData.passportSeries}
                              onChange={(e) => setFormData({ ...formData, passportSeries: e.target.value })}
                              required
                              className="bg-zinc-800 border-zinc-700 text-white"
                              maxLength={4}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Номер паспорта</Label>
                            <Input
                              value={formData.passportNumber}
                              onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                              required
                              className="bg-zinc-800 border-zinc-700 text-white"
                              maxLength={6}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Дата рождения</Label>
                          <Input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                            required
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        {editingClient && (
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Риск-скор: {(formData.scoringScore * 100).toFixed(0)}%</Label>
                            <Input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={formData.scoringScore}
                              onChange={(e) => setFormData({ ...formData, scoringScore: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        )}
                        {editingClient && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="isBlocked"
                              checked={formData.isBlocked}
                              onChange={(e) => setFormData({ ...formData, isBlocked: e.target.checked })}
                              className="rounded border-zinc-600"
                            />
                            <Label htmlFor="isBlocked" className="text-zinc-300">Клиент заблокирован</Label>
                          </div>
                        )}
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-zinc-700 text-zinc-300"
                            onClick={() => { resetForm(); setIsDialogOpen(false) }}
                          >
                            Отмена
                          </Button>
                          <Button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700"
                            disabled={createMutation.isPending || updateMutation.isPending}
                          >
                            {createMutation.isPending || updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Filters */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="Поиск по имени, телефону, email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <Select value={isBlockedFilter} onValueChange={setIsBlockedFilter}>
                    <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Статус блокировки" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все клиенты</SelectItem>
                      <SelectItem value="false">Активные</SelectItem>
                      <SelectItem value="true">Заблокированные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full bg-zinc-800" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableHead className="text-zinc-400">ID</TableHead>
                        <TableHead className="text-zinc-400">ФИО</TableHead>
                        <TableHead className="text-zinc-400">Телефон</TableHead>
                        <TableHead className="text-zinc-400">Email</TableHead>
                        <TableHead className="text-zinc-400">Паспорт</TableHead>
                        <TableHead className="text-zinc-400">Счета</TableHead>
                        <TableHead className="text-zinc-400">Риск-скор</TableHead>
                        <TableHead className="text-zinc-400">Статус</TableHead>
                        <TableHead className="text-zinc-400">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients?.map((client: Client) => (
                        <TableRow key={client.id} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="font-medium text-white">#{client.id}</TableCell>
                          <TableCell className="text-white">{client.fullName}</TableCell>
                          <TableCell className="text-zinc-300">{client.phone}</TableCell>
                          <TableCell className="text-zinc-300">{client.email || "-"}</TableCell>
                          <TableCell className="text-zinc-300">
                            {client.passportSeries} {client.passportNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {client.accounts?.length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={client.scoringScore * 100}
                                className={cn("h-2 w-16", getRiskProgressColor(client.scoringScore))}
                              />
                              <span className={cn("text-sm", getRiskColor(
                                client.scoringScore < 0.2 ? "Low" :
                                client.scoringScore < 0.5 ? "Medium" :
                                client.scoringScore < 0.8 ? "High" : "Critical"
                              ))}>
                                {(client.scoringScore * 100).toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.isBlocked ? (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                <UserX className="h-3 w-3 mr-1" />
                                Заблокирован
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                Активен
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                  onClick={() => handleEdit(client)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-zinc-800 text-red-400 hover:text-red-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-white">Удалить клиента?</AlertDialogTitle>
                                      <AlertDialogDescription className="text-zinc-400">
                                        Это действие необратимо. Все данные клиента и его счета будут удалены.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white">Отмена</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => deleteMutation.mutate(client.id)}
                                      >
                                        Удалить
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
