import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "RUB"): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function getRiskColor(level: string): string {
  switch (level.toLowerCase()) {
    case "low":
      return "text-green-500"
    case "medium":
      return "text-yellow-500"
    case "high":
      return "text-orange-500"
    case "critical":
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}

export function getRiskBgColor(level: string): string {
  switch (level.toLowerCase()) {
    case "low":
      return "bg-green-500/10 border-green-500/20"
    case "medium":
      return "bg-yellow-500/10 border-yellow-500/20"
    case "high":
      return "bg-orange-500/10 border-orange-500/20"
    case "critical":
      return "bg-red-500/10 border-red-500/20"
    default:
      return "bg-gray-500/10 border-gray-500/20"
  }
}

export function getRiskProgressColor(score: number): string {
  if (score < 0.2) return "bg-green-500"
  if (score < 0.4) return "bg-yellow-500"
  if (score < 0.7) return "bg-orange-500"
  return "bg-red-500"
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-500/10 text-green-500 border-green-500/20"
    case "frozen":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    case "closed":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/20"
    case "rejected":
      return "bg-red-500/10 text-red-500 border-red-500/20"
    case "processing":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20"
  }
}

export function downloadCSV(data: any[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ""
      }).join(",")
    )
  ].join("\n")

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${formatDateShort(new Date()).replace(/\./g, "-")}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
