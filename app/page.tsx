"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard-content"

export default function DashboardPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-red-500" />
          <p className="text-zinc-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <DashboardContent />
        </main>
      </div>
    </div>
  )
}
