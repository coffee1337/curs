"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  CreditCard,
  ArrowLeftRight,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { formatCurrency, formatDate, getRiskColor, getRiskBgColor, getRiskProgressColor, getStatusColor, cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

const RISK_COLORS = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
}

export function DashboardContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard")
      return res.json()
    },
    refetchInterval: 60000
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">Ошибка загрузки данных</p>
      </div>
    )
  }

  const riskChartData = [
    { name: "Низкий", value: data?.riskDistribution?.low || 0, color: RISK_COLORS.Low },
    { name: "Средний", value: data?.riskDistribution?.medium || 0, color: RISK_COLORS.Medium },
    { name: "Высокий", value: data?.riskDistribution?.high || 0, color: RISK_COLORS.High },
    { name: "Критический", value: data?.riskDistribution?.critical || 0, color: RISK_COLORS.Critical },
  ].filter(d => d.value > 0)

  const transactionTypeData = data?.transactionsByType?.map((t: any) => ({
    name: t.transactionType,
    count: t._count,
    amount: t._sum.amount || 0
  })) || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Панель управления</h1>
        <p className="text-zinc-400 mt-1">Обзор системы мониторинга транзакций</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Общая сумма транзакций</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data?.totalAmount || 0)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Завершённые транзакции
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Клиенты</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data?.clientStats?.total || 0}</div>
            <p className="text-xs text-red-500 mt-1">
              {data?.clientStats?.blocked || 0} заблокировано
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Счета</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data?.accountStats?.total || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {data?.accountStats?.active || 0} активных
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Транзакции</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(data?.transactionStats?.completed || 0) + (data?.transactionStats?.rejected || 0) + (data?.transactionStats?.processing || 0)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {data?.transactionStats?.processing || 0} в обработке
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Мошенничество</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{data?.fraudStats?.fraudCount || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">Выявлено случаев</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Проверено аналитиком</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{data?.fraudStats?.reviewedCount || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">Транзакций</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Требуют проверки</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{data?.fraudStats?.unreviewedHighRisk || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">Высокий риск</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Контрагенты</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data?.counterpartyStats?.total || 0}</div>
            <p className="text-xs text-red-500 mt-1">
              {data?.counterpartyStats?.blacklisted || 0} в чёрном списке
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Risk Distribution Pie Chart */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Распределение по уровням риска</CardTitle>
            <CardDescription className="text-zinc-400">Количество транзакций по категориям</CardDescription>
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
                    labelLine={false}
                  >
                    {riskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {riskChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-zinc-400">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Types Bar Chart */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Транзакции по типу</CardTitle>
            <CardDescription className="text-zinc-400">Количество и сумма по типам</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transactionTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(value: number) => [value.toLocaleString("ru-RU"), ""]}
                  />
                  <Bar dataKey="count" fill="#ef4444" name="Количество" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Последние транзакции</CardTitle>
          <CardDescription className="text-zinc-400">10 последних транзакций в системе</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">Клиент</TableHead>
                <TableHead className="text-zinc-400">Тип</TableHead>
                <TableHead className="text-zinc-400">Сумма</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-zinc-400">Риск</TableHead>
                <TableHead className="text-zinc-400">Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.recentTransactions?.map((tx: any) => (
                <TableRow key={tx.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium text-white">#{tx.id}</TableCell>
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
                        <Badge className={cn("border", getRiskBgColor(tx.riskScore.riskLevel))}>
                          {tx.riskScore.riskLevel}
                        </Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {formatDate(tx.transactionDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Clients */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Топ клиентов по транзакциям</CardTitle>
          <CardDescription className="text-zinc-400">Клиенты с наибольшей активностью</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                <TableHead className="text-zinc-400">Клиент</TableHead>
                <TableHead className="text-zinc-400">Кол-во транзакций</TableHead>
                <TableHead className="text-zinc-400">Риск-скор</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.topClients?.map((client: any) => (
                <TableRow key={client.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium text-white">{client.fullName}</TableCell>
                  <TableCell className="text-zinc-300">{client.transactionCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={client.scoringScore * 100}
                        className="h-2 w-20"
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
                    <Badge className={cn("border", client.scoringScore > 0.7 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20")}>
                      {client.scoringScore > 0.7 ? "Высокий риск" : "Норма"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64 bg-zinc-800" />
        <Skeleton className="h-5 w-96 mt-2 bg-zinc-800" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32 bg-zinc-800" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 bg-zinc-800" />
              <Skeleton className="h-4 w-16 mt-2 bg-zinc-800" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <Skeleton className="h-6 w-48 bg-zinc-800" />
              <Skeleton className="h-4 w-64 bg-zinc-800" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full bg-zinc-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
