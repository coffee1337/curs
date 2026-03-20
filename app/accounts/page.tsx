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
import { Card, CardContent } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Search, Edit, Trash2, CreditCard, Download } from "lucide-react"
import { formatCurrency, formatDateShort, getStatusColor, cn, downloadCSV } from "@/lib/utils"

export default function AccountsPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [formData, setFormData] = useState({
    clientId: "",
    accountNumber: "",
    balance: "0",
    currency: "RUB",
    openDate: "",
    status: "Active",
    accountType: "Debit"
  })

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", search, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (typeFilter !== "all") params.append("accountType", typeFilter)
      const res = await fetch(`/api/accounts?${params}`)
      return res.json()
    }
  })

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients")
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Ошибка создания")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Счёт успешно создан")
      resetForm()
      setIsDialogOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Ошибка обновления")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Счёт обновлён")
      resetForm()
      setIsDialogOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Ошибка удаления")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Счёт удалён")
    }
  })

  const resetForm = () => {
    setFormData({
      clientId: "",
      accountNumber: "",
      balance: "0",
      currency: "RUB",
      openDate: "",
      status: "Active",
      accountType: "Debit"
    })
    setEditingAccount(null)
  }

  const handleEdit = (account: any) => {
    setEditingAccount(account)
    setFormData({
      clientId: String(account.clientId),
      accountNumber: account.accountNumber,
      balance: String(account.balance),
      currency: account.currency,
      openDate: new Date(account.openDate).toISOString().split("T")[0],
      status: account.status,
      accountType: account.accountType
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleExport = () => {
    if (!accounts?.length) return
    const data = accounts.map((a: any) => ({
      ID: a.id,
      "Номер счёта": a.accountNumber,
      Клиент: a.client?.fullName,
      Баланс: a.balance,
      Валюта: a.currency,
      Тип: a.accountType,
      Статус: a.status,
      "Дата открытия": formatDateShort(a.openDate)
    }))
    downloadCSV(data, "accounts")
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Счета</h1>
                <p className="text-zinc-400 mt-1">Управление банковскими счетами</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт
                </Button>
                {canEdit && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить счёт
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingAccount ? "Редактировать счёт" : "Новый счёт"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Клиент</Label>
                          <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })} disabled={!!editingAccount}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                              <SelectValue placeholder="Выберите клиента" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              {clients?.map((c: any) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Номер счёта</Label>
                          <Input value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} required className="bg-zinc-800 border-zinc-700 text-white" disabled={!!editingAccount} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Баланс</Label>
                            <Input type="number" value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Валюта</Label>
                            <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="RUB">RUB</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Тип счёта</Label>
                            <Select value={formData.accountType} onValueChange={(v) => setFormData({ ...formData, accountType: v })}>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="Debit">Дебетовый</SelectItem>
                                <SelectItem value="Credit">Кредитный</SelectItem>
                                <SelectItem value="Savings">Накопительный</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Статус</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="Active">Активен</SelectItem>
                                <SelectItem value="Frozen">Заморожен</SelectItem>
                                <SelectItem value="Closed">Закрыт</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {!editingAccount && (
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Дата открытия</Label>
                            <Input type="date" value={formData.openDate} onChange={(e) => setFormData({ ...formData, openDate: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                          </div>
                        )}
                        <DialogFooter>
                          <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { resetForm(); setIsDialogOpen(false) }}>Отмена</Button>
                          <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input placeholder="Поиск по номеру счёта или клиенту..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="Active">Активен</SelectItem>
                      <SelectItem value="Frozen">Заморожен</SelectItem>
                      <SelectItem value="Closed">Закрыт</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все типы</SelectItem>
                      <SelectItem value="Debit">Дебетовый</SelectItem>
                      <SelectItem value="Credit">Кредитный</SelectItem>
                      <SelectItem value="Savings">Накопительный</SelectItem>
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
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-zinc-400">ID</TableHead>
                        <TableHead className="text-zinc-400">Номер счёта</TableHead>
                        <TableHead className="text-zinc-400">Клиент</TableHead>
                        <TableHead className="text-zinc-400">Баланс</TableHead>
                        <TableHead className="text-zinc-400">Тип</TableHead>
                        <TableHead className="text-zinc-400">Статус</TableHead>
                        <TableHead className="text-zinc-400">Дата открытия</TableHead>
                        <TableHead className="text-zinc-400">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts?.map((account: any) => (
                        <TableRow key={account.id} className="border-zinc-800">
                          <TableCell className="text-white">#{account.id}</TableCell>
                          <TableCell className="text-white font-mono">{account.accountNumber}</TableCell>
                          <TableCell className="text-zinc-300">{account.client?.fullName}</TableCell>
                          <TableCell className={cn("font-medium", account.balance < 0 ? "text-red-400" : "text-white")}>
                            {formatCurrency(account.balance, account.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-zinc-700 text-zinc-300">{account.accountType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border", getStatusColor(account.status))}>{account.status}</Badge>
                          </TableCell>
                          <TableCell className="text-zinc-300">{formatDateShort(account.openDate)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-zinc-400" onClick={() => handleEdit(account)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-red-400">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-white">Удалить счёт?</AlertDialogTitle>
                                      <AlertDialogDescription className="text-zinc-400">Это действие необратимо.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white">Отмена</AlertDialogCancel>
                                      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(account.id)}>Удалить</AlertDialogAction>
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
