"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { FileText, Download, ShieldAlert, Users, ArrowLeftRight, AlertTriangle, TrendingUp } from "lucide-react"
import { formatCurrency, formatDateShort, getRiskBgColor, cn, downloadCSV } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts"

const RISK_COLORS = { Low: "#22c55e", Medium: "#eab308", High: "#f97316", Critical: "#ef4444" }

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [reportType, setReportType] = useState("fraud")

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard")
      return res.json()
    }
  })

  const handleExportReport = () => {
    if (!dashboardData) return

    let data: any[] = []
    let filename = ""

    switch (reportType) {
      case "fraud":
        data = dashboardData.recentFraud?.map((f: any) => ({
          "ID транзакции": f.transactionId,
          Клиент: f.transaction?.senderAccount?.client?.fullName,
          Сумма: f.transaction?.amount,
          "Риск-скор": (f.riskScoreValue * 100).toFixed(0) + "%",
          "Уровень риска": f.riskLevel,
          "Дата обнаружения": formatDateShort(f.scoredAt),
          Комментарий: f.analystComment || ""
        })) || []
        filename = "fraud-report"
        break
      case "risk":
        const riskData = dashboardData.riskDistribution
        data = [
          { "Уровень риска": "Низкий", Количество: riskData?.low || 0 },
          { "Уровень риска": "Средний", Количество: riskData?.medium || 0 },
          { "Уровень риска": "Высокий", Количество: riskData?.high || 0 },
          { "Уровень риска": "Критический", Количество: riskData?.critical || 0 }
        ]
        filename = "risk-distribution-report"
        break
      case "clients":
        data = dashboardData.topClients?.map((c: any) => ({
          ID: c.id,
          Клиент: c.fullName,
          "Кол-во транзакций": c.transactionCount,
          "Риск-скор": (c.scoringScore * 100).toFixed(0) + "%"
        })) || []
        filename = "top-clients-report"
        break
      case "transactions":
        data = dashboardData.transactionsByType?.map((t: any) => ({
          Тип: t.transactionType,
          Количество: t._count,
          "Общая сумма": t._sum.amount || 0
        })) || []
        filename = "transactions-by-type-report"
        break
    }

    if (data.length > 0) {
      downloadCSV(data, filename)
      toast.success("Отчёт экспортирован")
    }
  }

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center bg-zinc-950"><div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-red-500" /></div>
  }

  if (status === "unauthenticated") {
    return null
  }

  const riskChartData = [
    { name: "Низкий", value: dashboardData?.riskDistribution?.low || 0, color: RISK_COLORS.Low },
    { name: "Средний", value: dashboardData?.riskDistribution?.medium || 0, color: RISK_COLORS.Medium },
    { name: "Высокий", value: dashboardData?.riskDistribution?.high || 0, color: RISK_COLORS.High },
    { name: "Критический", value: dashboardData?.riskDistribution?.critical || 0, color: RISK_COLORS.Critical },
  ].filter(d => d.value > 0)

  const transactionTypeData = dashboardData?.transactionsByType?.map((t: any) => ({
    name: t.transactionType,
    count: t._count,
    amount: t._sum.amount || 0
  })) || []

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Отчёты</h1>
                <p className="text-zinc-400 mt-1">Аналитические отчёты и статистика</p>
              </div>
              <div className="flex gap-2">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="fraud">Мошеннические транзакции</SelectItem>
                    <SelectItem value="risk">Распределение рисков</SelectItem>
                    <SelectItem value="clients">Топ клиентов</SelectItem>
                    <SelectItem value="transactions">По типам транзакций</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleExportReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт CSV
                </Button>
              </div>
            </div>

            {/* Report Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Всего транзакций</CardTitle>
                  <ArrowLeftRight className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {(dashboardData?.transactionStats?.completed || 0) + (dashboardData?.transactionStats?.rejected || 0) + (dashboardData?.transactionStats?.processing || 0)}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {dashboardData?.transactionStats?.completed || 0} завершено
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Мошенничество</CardTitle>
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{dashboardData?.fraudStats?.fraudCount || 0}</div>
                  <p className="text-xs text-zinc-500 mt-1">случаев выявлено</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Клиенты с высоким риском</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">
                    {dashboardData?.topClients?.filter((c: any) => c.scoringScore > 0.5).length || 0}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">требуют внимания</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Общая сумма</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(dashboardData?.totalAmount || 0)}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">завершённые транзакции</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Распределение по уровню риска</CardTitle>
                  <CardDescription className="text-zinc-400">Круговая диаграмма</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {riskChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} itemStyle={{ color: "#fff" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Транзакции по типам</CardTitle>
                  <CardDescription className="text-zinc-400">Столбчатая диаграмма</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transactionTypeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                        <YAxis stroke="#71717a" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} itemStyle={{ color: "#fff" }} />
                        <Bar dataKey="count" fill="#ef4444" name="Количество" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fraud Report Table */}
            {reportType === "fraud" && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Последние мошеннические транзакции</CardTitle>
                  <CardDescription className="text-zinc-400">Транзакции, отмеченные как мошеннические</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData?.recentFraud?.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <ShieldAlert className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Транзакция #{f.transactionId}</p>
                            <p className="text-zinc-400 text-sm">{f.transaction?.senderAccount?.client?.fullName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(f.transaction?.amount)}</p>
                          <Badge className={cn("border", getRiskBgColor(f.riskLevel))}>{f.riskLevel}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-400 text-sm">{formatDateShort(f.scoredAt)}</p>
                          <p className="text-zinc-500 text-xs truncate max-w-[200px]">{f.analystComment || "-"}</p>
                        </div>
                      </div>
                    ))}
                    {(!dashboardData?.recentFraud || dashboardData.recentFraud.length === 0) && (
                      <p className="text-center text-zinc-500 py-8">Нет мошеннических транзакций</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
