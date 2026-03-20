"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Eye,
  Trash2,
  ArrowLeftRight,
  Download,
  Filter,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Tag,
} from "lucide-react"
import { formatCurrency, formatDate, getRiskColor, getRiskBgColor, getRiskProgressColor, getStatusColor, cn, downloadCSV } from "@/lib/utils"

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [riskLevelFilter, setRiskLevelFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Dialogs
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [analystComment, setAnalystComment] = useState("")
  const [isFraud, setIsFraud] = useState(false)

  // Form
  const [formData, setFormData] = useState({
    senderAccountId: "",
    receiverAccountId: "",
    counterpartyId: "",
    amount: "",
    transactionType: "Payment",
    status: "Completed",
    description: "",
    ipAddress: "",
    deviceId: ""
  })

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams()
    if (search) params.append("search", search)
    if (statusFilter !== "all") params.append("status", statusFilter)
    if (typeFilter !== "all") params.append("transactionType", typeFilter)
    if (riskLevelFilter !== "all") params.append("riskLevel", riskLevelFilter)
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)
    if (minAmount) params.append("minAmount", minAmount)
    if (maxAmount) params.append("maxAmount", maxAmount)
    return params.toString()
  }

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", buildQueryParams()],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?${buildQueryParams()}`)
      return res.json()
    }
  })

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts")
      return res.json()
    }
  })

  const { data: counterparties } = useQuery({
    queryKey: ["counterparties"],
    queryFn: async () => {
      const res = await fetch("/api/counterparties")
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/transactions", {
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
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success("Транзакция успешно создана")
      resetForm()
      setIsCreateOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Ошибка обновления")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      toast.success("Транзакция обновлена")
      setIsDetailOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Ошибка удаления")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      toast.success("Транзакция удалена")
      setIsDetailOpen(false)
    }
  })

  const resetForm = () => {
    setFormData({
      senderAccountId: "",
      receiverAccountId: "",
      counterpartyId: "",
      amount: "",
      transactionType: "Payment",
      status: "Completed",
      description: "",
      ipAddress: "",
      deviceId: ""
    })
  }

  const handleViewDetail = (tx: any) => {
    setSelectedTransaction(tx)
    setAnalystComment(tx.riskScore?.analystComment || "")
    setIsFraud(tx.riskScore?.isFraud || false)
    setIsDetailOpen(true)
  }

  const handleReview = () => {
    if (!selectedTransaction) return
    updateMutation.mutate({
      id: selectedTransaction.id,
      data: {
        riskScoreUpdate: true,
        analystComment,
        isFraud
      }
    })
  }

  const handleExport = () => {
    if (!transactions || transactions.length === 0) return
    const exportData = transactions.map((tx: any) => ({
      ID: tx.id,
      Дата: formatDate(tx.transactionDate),
      Клиент: tx.senderAccount?.client?.fullName || "",
      "Счёт отправителя": tx.senderAccount?.accountNumber || "",
      "Счёт получателя": tx.receiverAccount?.accountNumber || "",
      Контрагент: tx.counterparty?.name || "",
      Тип: tx.transactionType,
      Сумма: tx.amount,
      Статус: tx.status,
      "Уровень риска": tx.riskScore?.riskLevel || "",
      "Риск-скор": tx.riskScore?.riskScoreValue?.toFixed(2) || "",
      Мошенничество: tx.riskScore?.isFraud ? "Да" : "Нет",
      Описание: tx.description || ""
    }))
    downloadCSV(exportData, "transactions")
    toast.success("Данные экспортированы")
  }

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setTypeFilter("all")
    setRiskLevelFilter("all")
    setDateFrom("")
    setDateTo("")
    setMinAmount("")
    setMaxAmount("")
  }

  const hasActiveFilters = search || statusFilter !== "all" || typeFilter !== "all" || 
    riskLevelFilter !== "all" || dateFrom || dateTo || minAmount || maxAmount

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
                <h1 className="text-3xl font-bold text-white">Транзакции</h1>
                <p className="text-zinc-400 mt-1">Мониторинг и управление транзакциями</p>
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
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Новая транзакция
                  </Button>
                )}
              </div>
            </div>

            {/* Search and Filters Toggle */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="Поиск по описанию, счёту, клиенту..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className={cn(
                      "border-zinc-700",
                      showFilters ? "bg-zinc-800 text-white" : "text-zinc-300"
                    )}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Фильтры
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-red-500 text-white border-0 h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>
                    )}
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      className="text-zinc-400 hover:text-white"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Сбросить
                    </Button>
                  )}
                </div>

                {/* Extended Filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Статус</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="all">Все статусы</SelectItem>
                          <SelectItem value="Completed">Завершена</SelectItem>
                          <SelectItem value="Rejected">Отклонена</SelectItem>
                          <SelectItem value="Processing">В обработке</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Тип</Label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="all">Все типы</SelectItem>
                          <SelectItem value="Payment">Платёж</SelectItem>
                          <SelectItem value="Transfer">Перевод</SelectItem>
                          <SelectItem value="Withdrawal">Снятие</SelectItem>
                          <SelectItem value="Deposit">Пополнение</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Уровень риска</Label>
                      <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="all">Все уровни</SelectItem>
                          <SelectItem value="Low">Низкий</SelectItem>
                          <SelectItem value="Medium">Средний</SelectItem>
                          <SelectItem value="High">Высокий</SelectItem>
                          <SelectItem value="Critical">Критический</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Дата с</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Дата по</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Сумма от</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Сумма до</Label>
                      <Input
                        type="number"
                        placeholder="1000000"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full bg-zinc-800" />
                    ))}
                  </div>
                ) : transactions?.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    Транзакции не найдены
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableHead className="text-zinc-400">ID</TableHead>
                        <TableHead className="text-zinc-400">Дата</TableHead>
                        <TableHead className="text-zinc-400">Клиент</TableHead>
                        <TableHead className="text-zinc-400">Тип</TableHead>
                        <TableHead className="text-zinc-400">Сумма</TableHead>
                        <TableHead className="text-zinc-400">Статус</TableHead>
                        <TableHead className="text-zinc-400">Риск</TableHead>
                        <TableHead className="text-zinc-400">Метки</TableHead>
                        <TableHead className="text-zinc-400"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions?.map((tx: any) => (
                        <TableRow key={tx.id} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="font-medium text-white">#{tx.id}</TableCell>
                          <TableCell className="text-zinc-300 text-sm">
                            {formatDate(tx.transactionDate)}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {tx.senderAccount?.client?.fullName || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                              {tx.transactionType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border", getStatusColor(tx.status))}>
                              {tx.status === "Completed" ? "Завершена" : tx.status === "Rejected" ? "Отклонена" : "В обработке"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.riskScore && (
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={tx.riskScore.riskScoreValue * 100}
                                  className="h-2 w-16"
                                />
                                <Badge className={cn("border text-xs", getRiskBgColor(tx.riskScore.riskLevel))}>
                                  {tx.riskScore.riskLevel}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {tx.labels?.slice(0, 2).map((l: any) => (
                                <Badge key={l.labelId} variant="outline" className="text-xs border-orange-500/30 text-orange-400">
                                  {l.label.labelName}
                                </Badge>
                              ))}
                              {tx.labels?.length > 2 && (
                                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                                  +{tx.labels.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
                              onClick={() => handleViewDetail(tx)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Транзакция #{selectedTransaction?.id}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Детальная информация о транзакции
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Main Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-zinc-400 text-sm">Дата</p>
                    <p className="text-white">{formatDate(selectedTransaction.transactionDate)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Тип</p>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                      {selectedTransaction.transactionType}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Сумма</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Статус</p>
                    <Badge className={cn("border", getStatusColor(selectedTransaction.status))}>
                      {selectedTransaction.status === "Completed" ? "Завершена" : selectedTransaction.status === "Rejected" ? "Отклонена" : "В обработке"}
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Sender/Receiver */}
                <div className="grid grid-cols-2 gap-6">
                  <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zinc-400">Отправитель</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-white font-medium">{selectedTransaction.senderAccount?.client?.fullName}</p>
                      <p className="text-zinc-400 text-sm">{selectedTransaction.senderAccount?.accountNumber}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zinc-400">Получатель</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTransaction.receiverAccount ? (
                        <>
                          <p className="text-white font-medium">{selectedTransaction.receiverAccount?.client?.fullName}</p>
                          <p className="text-zinc-400 text-sm">{selectedTransaction.receiverAccount?.accountNumber}</p>
                        </>
                      ) : selectedTransaction.counterparty ? (
                        <>
                          <p className="text-white font-medium">{selectedTransaction.counterparty?.name}</p>
                          <p className="text-zinc-400 text-sm">ИНН: {selectedTransaction.counterparty?.taxId}</p>
                          {selectedTransaction.counterparty?.isBlacklisted && (
                            <Badge className="mt-1 bg-red-500/10 text-red-500 border-red-500/20">В чёрном списке</Badge>
                          )}
                        </>
                      ) : (
                        <p className="text-zinc-400">Внешний платёж</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Risk Score */}
                {selectedTransaction.riskScore && (
                  <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Оценка риска
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-zinc-400 text-sm">Риск-скор</span>
                            <span className={cn("font-bold", getRiskColor(selectedTransaction.riskScore.riskLevel))}>
                              {(selectedTransaction.riskScore.riskScoreValue * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={selectedTransaction.riskScore.riskScoreValue * 100}
                            className="h-3"
                          />
                        </div>
                        <Badge className={cn("border", getRiskBgColor(selectedTransaction.riskScore.riskLevel))}>
                          {selectedTransaction.riskScore.riskLevel}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-400">Модель:</span>
                          <span className="text-white ml-2">{selectedTransaction.riskScore.modelVersion}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Мошенничество:</span>
                          <Badge className={cn("ml-2", selectedTransaction.riskScore.isFraud ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500")}>
                            {selectedTransaction.riskScore.isFraud ? "Да" : "Нет"}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-zinc-400">Проверено:</span>
                          <Badge className={cn("ml-2", selectedTransaction.riskScore.reviewedByAnalyst ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500")}>
                            {selectedTransaction.riskScore.reviewedByAnalyst ? "Да" : "Нет"}
                          </Badge>
                        </div>
                      </div>

                      {/* Feature Vector */}
                      {selectedTransaction.riskScore.featureVectorJson && (
                        <div>
                          <p className="text-zinc-400 text-sm mb-2">Вектор признаков:</p>
                          <pre className="bg-zinc-950 p-2 rounded text-xs text-zinc-300 overflow-auto">
                            {JSON.stringify(JSON.parse(selectedTransaction.riskScore.featureVectorJson), null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Labels */}
                {selectedTransaction.labels?.length > 0 && (
                  <div>
                    <p className="text-zinc-400 text-sm mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Метки риска
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTransaction.labels.map((l: any) => (
                        <Badge key={l.labelId} className={cn(
                          "border",
                          l.label.severity === "High" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          l.label.severity === "Medium" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}>
                          {l.label.labelName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description & Technical */}
                {selectedTransaction.description && (
                  <div>
                    <p className="text-zinc-400 text-sm mb-1">Описание</p>
                    <p className="text-white">{selectedTransaction.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedTransaction.ipAddress && (
                    <div>
                      <span className="text-zinc-400">IP:</span>
                      <span className="text-white ml-2">{selectedTransaction.ipAddress}</span>
                    </div>
                  )}
                  {selectedTransaction.deviceId && (
                    <div>
                      <span className="text-zinc-400">Device:</span>
                      <span className="text-white ml-2 truncate">{selectedTransaction.deviceId}</span>
                    </div>
                  )}
                </div>

                {/* Analyst Review Section */}
                {canEdit && selectedTransaction.riskScore && (
                  <>
                    <Separator className="bg-zinc-800" />
                    <div className="space-y-4">
                      <h4 className="text-white font-medium">Проверка аналитика</h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isFraudCheck"
                          checked={isFraud}
                          onChange={(e) => setIsFraud(e.target.checked)}
                          className="rounded border-zinc-600"
                        />
                        <Label htmlFor="isFraudCheck" className="text-zinc-300">
                          Отметить как мошенничество
                        </Label>
                      </div>
                      <Textarea
                        placeholder="Комментарий аналитика..."
                        value={analystComment}
                        onChange={(e) => setAnalystComment(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                      />
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2">
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Удалить транзакцию?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      Это действие необратимо.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white">Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => deleteMutation.mutate(selectedTransaction?.id)}
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setIsDetailOpen(false)}>
              Закрыть
            </Button>
            {canEdit && selectedTransaction?.riskScore && (
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleReview}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Сохранение..." : "Сохранить проверку"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Новая транзакция</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Создание новой транзакции
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate(formData)
          }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Счёт отправителя</Label>
              <Select value={formData.senderAccountId} onValueChange={(v) => setFormData({ ...formData, senderAccountId: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Выберите счёт" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {accounts?.map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.accountNumber} - {a.client?.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Тип транзакции</Label>
              <Select value={formData.transactionType} onValueChange={(v) => setFormData({ ...formData, transactionType: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Payment">Платёж</SelectItem>
                  <SelectItem value="Transfer">Перевод</SelectItem>
                  <SelectItem value="Withdrawal">Снятие</SelectItem>
                  <SelectItem value="Deposit">Пополнение</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.transactionType === "Transfer" && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Счёт получателя</Label>
                <Select value={formData.receiverAccountId} onValueChange={(v) => setFormData({ ...formData, receiverAccountId: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Выберите счёт" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {accounts?.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.accountNumber} - {a.client?.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.transactionType === "Payment" || !formData.receiverAccountId) && formData.transactionType !== "Transfer" && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Контрагент</Label>
                <Select value={formData.counterpartyId} onValueChange={(v) => setFormData({ ...formData, counterpartyId: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Выберите контрагента" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {counterparties?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.isBlacklisted && "🚫"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-300">Сумма (RUB)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Описание</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="Назначение платежа"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">IP-адрес</Label>
                <Input
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Статус</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="Completed">Завершена</SelectItem>
                    <SelectItem value="Processing">В обработке</SelectItem>
                    <SelectItem value="Rejected">Отклонена</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { resetForm(); setIsCreateOpen(false) }}>
                Отмена
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Создание..." : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
