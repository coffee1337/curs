"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ShieldAlert, Download, CheckCircle2, XCircle, Clock } from "lucide-react"
import { formatCurrency, formatDate, getRiskColor, getRiskBgColor, cn, downloadCSV } from "@/lib/utils"

export default function RiskScoresPage() {
  const { data: session, status } = useSession()
  const [riskLevelFilter, setRiskLevelFilter] = useState("all")
  const [isFraudFilter, setIsFraudFilter] = useState("all")
  const [reviewedFilter, setReviewedFilter] = useState("all")

  const { data: riskScores, isLoading } = useQuery({
    queryKey: ["risk-scores", riskLevelFilter, isFraudFilter, reviewedFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (riskLevelFilter !== "all") params.append("riskLevel", riskLevelFilter)
      if (isFraudFilter !== "all") params.append("isFraud", isFraudFilter)
      if (reviewedFilter !== "all") params.append("reviewed", reviewedFilter)
      const res = await fetch(`/api/risk-scores?${params}`)
      return res.json()
    }
  })

  const handleExport = () => {
    if (!riskScores?.length) return
    const data = riskScores.map((rs: any) => ({
      ID: rs.id, "ID транзакции": rs.transactionId, Клиент: rs.transaction?.senderAccount?.client?.fullName,
      Сумма: rs.transaction?.amount, "Уровень риска": rs.riskLevel, "Риск-скор": (rs.riskScoreValue * 100).toFixed(0) + "%",
      Мошенничество: rs.isFraud ? "Да" : "Нет", Проверено: rs.reviewedByAnalyst ? "Да" : "Нет",
      Комментарий: rs.analystComment || "", Дата: formatDate(rs.scoredAt)
    }))
    downloadCSV(data, "risk-scores")
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
                <h1 className="text-3xl font-bold text-white">Оценки риска</h1>
                <p className="text-zinc-400 mt-1">ML-оценка риска транзакций</p>
              </div>
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />Экспорт
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Всего оценок</p>
                      <p className="text-2xl font-bold text-white">{riskScores?.length || 0}</p>
                    </div>
                    <ShieldAlert className="h-8 w-8 text-zinc-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Мошенничество</p>
                      <p className="text-2xl font-bold text-red-500">{riskScores?.filter((rs: any) => rs.isFraud).length || 0}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Проверено</p>
                      <p className="text-2xl font-bold text-green-500">{riskScores?.filter((rs: any) => rs.reviewedByAnalyst).length || 0}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Ожидают проверки</p>
                      <p className="text-2xl font-bold text-yellow-500">{riskScores?.filter((rs: any) => !rs.reviewedByAnalyst && (rs.riskLevel === "High" || rs.riskLevel === "Critical")).length || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Уровень риска" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все уровни</SelectItem>
                      <SelectItem value="Low">Низкий</SelectItem>
                      <SelectItem value="Medium">Средний</SelectItem>
                      <SelectItem value="High">Высокий</SelectItem>
                      <SelectItem value="Critical">Критический</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={isFraudFilter} onValueChange={setIsFraudFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Мошенничество" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="true">Да</SelectItem>
                      <SelectItem value="false">Нет</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Проверка" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="true">Проверено</SelectItem>
                      <SelectItem value="false">Не проверено</SelectItem>
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
                      <TableHead className="text-zinc-400">ID</TableHead>
                      <TableHead className="text-zinc-400">Транзакция</TableHead>
                      <TableHead className="text-zinc-400">Клиент</TableHead>
                      <TableHead className="text-zinc-400">Сумма</TableHead>
                      <TableHead className="text-zinc-400">Риск-скор</TableHead>
                      <TableHead className="text-zinc-400">Уровень</TableHead>
                      <TableHead className="text-zinc-400">Мошенничество</TableHead>
                      <TableHead className="text-zinc-400">Проверено</TableHead>
                      <TableHead className="text-zinc-400">Дата</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {riskScores?.map((rs: any) => (
                        <TableRow key={rs.id} className="border-zinc-800">
                          <TableCell className="text-white">#{rs.id}</TableCell>
                          <TableCell className="text-zinc-300">#{rs.transactionId}</TableCell>
                          <TableCell className="text-zinc-300">{rs.transaction?.senderAccount?.client?.fullName}</TableCell>
                          <TableCell className="text-white font-medium">{formatCurrency(rs.transaction?.amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={rs.riskScoreValue * 100} className="h-2 w-16" />
                              <span className={cn("text-sm font-medium", getRiskColor(rs.riskLevel))}>{(rs.riskScoreValue * 100).toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge className={cn("border", getRiskBgColor(rs.riskLevel))}>{rs.riskLevel}</Badge></TableCell>
                          <TableCell>
                            {rs.isFraud ? <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Да</Badge> : <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Нет</Badge>}
                          </TableCell>
                          <TableCell>
                            {rs.reviewedByAnalyst ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-yellow-500" />}
                          </TableCell>
                          <TableCell className="text-zinc-400 text-sm">{formatDate(rs.scoredAt)}</TableCell>
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
