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
import { Plus, Edit, Trash2, Tags, Download } from "lucide-react"
import { cn, downloadCSV } from "@/lib/utils"

export default function RiskLabelsPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState<any>(null)
  const [formData, setFormData] = useState({ labelName: "", description: "", severity: "Medium" })

  const { data: labels, isLoading } = useQuery({
    queryKey: ["risk-labels"],
    queryFn: async () => {
      const res = await fetch("/api/risk-labels")
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/risk-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Ошибка создания")
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["risk-labels"] }); toast.success("Метка создана"); resetForm(); setIsDialogOpen(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/risk-labels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Ошибка обновления")
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["risk-labels"] }); toast.success("Метка обновлена"); resetForm(); setIsDialogOpen(false) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/risk-labels/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Ошибка удаления")
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["risk-labels"] }); toast.success("Метка удалена") }
  })

  const resetForm = () => { setFormData({ labelName: "", description: "", severity: "Medium" }); setEditingLabel(null) }
  const handleEdit = (l: any) => { setEditingLabel(l); setFormData({ labelName: l.labelName, description: l.description || "", severity: l.severity }); setIsDialogOpen(true) }
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (editingLabel) updateMutation.mutate({ id: editingLabel.id, data: formData }); else createMutation.mutate(formData) }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High": return "bg-red-500/10 text-red-500 border-red-500/20"
      case "Medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
    }
  }

  const handleExport = () => {
    if (!labels?.length) return
    const data = labels.map((l: any) => ({ ID: l.id, Название: l.labelName, Описание: l.description, Важность: l.severity, "Использований": l._count?.transactions || 0 }))
    downloadCSV(data, "risk-labels")
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
                <h1 className="text-3xl font-bold text-white">Метки риска</h1>
                <p className="text-zinc-400 mt-1">Управление метками для классификации транзакций</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Экспорт</Button>
                {session?.user?.role === "Admin" && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button className="bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4 mr-2" />Добавить</Button></DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
                      <DialogHeader><DialogTitle>{editingLabel ? "Редактировать" : "Новая метка"}</DialogTitle></DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2"><Label className="text-zinc-300">Название</Label><Input value={formData.labelName} onChange={(e) => setFormData({ ...formData, labelName: e.target.value })} required className="bg-zinc-800 border-zinc-700 text-white" /></div>
                        <div className="space-y-2"><Label className="text-zinc-300">Описание</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                        <div className="space-y-2"><Label className="text-zinc-300">Важность</Label>
                          <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              <SelectItem value="Low">Низкая</SelectItem><SelectItem value="Medium">Средняя</SelectItem><SelectItem value="High">Высокая</SelectItem>
                            </SelectContent>
                          </Select>
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
                {isLoading ? <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-zinc-800" />)}</div> : (
                  <Table>
                    <TableHeader><TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">ID</TableHead>
                      <TableHead className="text-zinc-400">Название</TableHead>
                      <TableHead className="text-zinc-400">Описание</TableHead>
                      <TableHead className="text-zinc-400">Важность</TableHead>
                      <TableHead className="text-zinc-400">Использований</TableHead>
                      {session?.user?.role === "Admin" && <TableHead className="text-zinc-400">Действия</TableHead>}
                    </TableRow></TableHeader>
                    <TableBody>
                      {labels?.map((l: any) => (
                        <TableRow key={l.id} className="border-zinc-800">
                          <TableCell className="text-white">#{l.id}</TableCell>
                          <TableCell className="text-white font-medium">{l.labelName}</TableCell>
                          <TableCell className="text-zinc-300">{l.description || "-"}</TableCell>
                          <TableCell><Badge className={cn("border", getSeverityColor(l.severity))}>{l.severity}</Badge></TableCell>
                          <TableCell className="text-zinc-300">{l._count?.transactions || 0}</TableCell>
                          {session?.user?.role === "Admin" && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-zinc-400" onClick={() => handleEdit(l)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-red-400"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                                    <AlertDialogHeader><AlertDialogTitle className="text-white">Удалить метку?</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Это действие необратимо.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white">Отмена</AlertDialogCancel>
                                      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(l.id)}>Удалить</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          )}
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
