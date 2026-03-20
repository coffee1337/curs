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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Search, Edit, Trash2, Building2, Download, AlertTriangle } from "lucide-react"
import { formatDateShort, getRiskBgColor, cn, downloadCSV } from "@/lib/utils"

export default function CounterpartiesPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [riskLevelFilter, setRiskLevelFilter] = useState("all")
  const [blacklistFilter, setBlacklistFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCounterparty, setEditingCounterparty] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "", taxId: "", activityCategory: "", riskLevel: "Low", isBlacklisted: false, countryOfRegistry: "Russia"
  })

  const { data: counterparties, isLoading } = useQuery({
    queryKey: ["counterparties", search, riskLevelFilter, blacklistFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (riskLevelFilter !== "all") params.append("riskLevel", riskLevelFilter)
      if (blacklistFilter !== "all") params.append("isBlacklisted", blacklistFilter)
      const res = await fetch(`/api/counterparties?${params}`)
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/counterparties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Ошибка создания")
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["counterparties"] }); toast.success("Контрагент создан"); resetForm(); setIsDialogOpen(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/counterparties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Ошибка обновления")
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["counterparties"] }); toast.success("Контрагент обновлён"); resetForm(); setIsDialogOpen(false) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/counterparties/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Ошибка удаления")
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["counterparties"] }); toast.success("Контрагент удалён") }
  })

  const resetForm = () => {
    setFormData({ name: "", taxId: "", activityCategory: "", riskLevel: "Low", isBlacklisted: false, countryOfRegistry: "Russia" })
    setEditingCounterparty(null)
  }

  const handleEdit = (c: any) => {
    setEditingCounterparty(c)
    setFormData({
      name: c.name, taxId: c.taxId, activityCategory: c.activityCategory || "",
      riskLevel: c.riskLevel, isBlacklisted: c.isBlacklisted, countryOfRegistry: c.countryOfRegistry
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCounterparty) updateMutation.mutate({ id: editingCounterparty.id, data: formData })
    else createMutation.mutate(formData)
  }

  const handleExport = () => {
    if (!counterparties?.length) return
    const data = counterparties.map((c: any) => ({
      ID: c.id, Название: c.name, ИНН: c.taxId, Категория: c.activityCategory,
      "Уровень риска": c.riskLevel, "Чёрный список": c.isBlacklisted ? "Да" : "Нет", Страна: c.countryOfRegistry
    }))
    downloadCSV(data, "counterparties")
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
                <h1 className="text-3xl font-bold text-white">Контрагенты</h1>
                <p className="text-zinc-400 mt-1">Управление контрагентами и их риск-профилем</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />Экспорт
                </Button>
                {session?.user?.role !== "Operator" && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4 mr-2" />Добавить</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
                      <DialogHeader><DialogTitle>{editingCounterparty ? "Редактировать" : "Новый контрагент"}</DialogTitle></DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2"><Label className="text-zinc-300">Название</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="bg-zinc-800 border-zinc-700 text-white" /></div>
                        <div className="space-y-2"><Label className="text-zinc-300">ИНН</Label><Input value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} required className="bg-zinc-800 border-zinc-700 text-white" /></div>
                        <div className="space-y-2"><Label className="text-zinc-300">Категория деятельности</Label><Input value={formData.activityCategory} onChange={(e) => setFormData({ ...formData, activityCategory: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-zinc-300">Уровень риска</Label>
                            <Select value={formData.riskLevel} onValueChange={(v) => setFormData({ ...formData, riskLevel: v })}>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="Low">Низкий</SelectItem><SelectItem value="Medium">Средний</SelectItem><SelectItem value="High">Высокий</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2"><Label className="text-zinc-300">Страна</Label><Input value={formData.countryOfRegistry} onChange={(e) => setFormData({ ...formData, countryOfRegistry: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="isBlacklisted" checked={formData.isBlacklisted} onChange={(e) => setFormData({ ...formData, isBlacklisted: e.target.checked })} className="rounded border-zinc-600" />
                          <Label htmlFor="isBlacklisted" className="text-zinc-300">В чёрном списке</Label>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { resetForm(); setIsDialogOpen(false) }}>Отмена</Button>
                          <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending || updateMutation.isPending}>Сохранить</Button>
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
                  <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" /><Input placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-zinc-800 border-zinc-700 text-white" /></div>
                  <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Риск" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все уровни</SelectItem><SelectItem value="Low">Низкий</SelectItem><SelectItem value="Medium">Средний</SelectItem><SelectItem value="High">Высокий</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={blacklistFilter} onValueChange={setBlacklistFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="ЧС" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все</SelectItem><SelectItem value="true">В ЧС</SelectItem><SelectItem value="false">Не в ЧС</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                {isLoading ? <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-zinc-800" />)}</div> : (
                  <Table>
                    <TableHeader><TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">ID</TableHead><TableHead className="text-zinc-400">Название</TableHead><TableHead className="text-zinc-400">ИНН</TableHead>
                      <TableHead className="text-zinc-400">Категория</TableHead><TableHead className="text-zinc-400">Риск</TableHead><TableHead className="text-zinc-400">ЧС</TableHead><TableHead className="text-zinc-400">Страна</TableHead><TableHead className="text-zinc-400">Действия</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {counterparties?.map((c: any) => (
                        <TableRow key={c.id} className="border-zinc-800">
                          <TableCell className="text-white">#{c.id}</TableCell>
                          <TableCell className="text-white">{c.name}</TableCell>
                          <TableCell className="text-zinc-300 font-mono">{c.taxId}</TableCell>
                          <TableCell className="text-zinc-300">{c.activityCategory || "-"}</TableCell>
                          <TableCell><Badge className={cn("border", getRiskBgColor(c.riskLevel))}>{c.riskLevel}</Badge></TableCell>
                          <TableCell>
                            {c.isBlacklisted ? <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" />В ЧС</Badge> : <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Нет</Badge>}
                          </TableCell>
                          <TableCell className="text-zinc-300">{c.countryOfRegistry}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {session?.user?.role !== "Operator" && <Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-zinc-400" onClick={() => handleEdit(c)}><Edit className="h-4 w-4" /></Button>}
                              {session?.user?.role === "Admin" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-red-400"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                                    <AlertDialogHeader><AlertDialogTitle className="text-white">Удалить?</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Это действие необратимо.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white">Отмена</AlertDialogCancel>
                                      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(c.id)}>Удалить</AlertDialogAction>
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
