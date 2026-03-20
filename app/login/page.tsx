"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl
      })

      if (result?.error) {
        setError("Неверный email или пароль")
        setIsLoading(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      setError("Произошла ошибка при входе")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg shadow-red-600/20 mb-4">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TransMonitor</h1>
          <p className="text-zinc-400 text-sm mt-1">ML Risk Assessment System</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white text-center">Вход в систему</CardTitle>
            <CardDescription className="text-zinc-400 text-center">
              Введите ваши учетные данные для доступа к системе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  "Войти"
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-2 font-medium">Демо-аккаунты:</p>
              <div className="space-y-1 text-xs text-zinc-500">
                <p><span className="text-zinc-300">Админ:</span> admin@monitoring.ru / admin123</p>
                <p><span className="text-zinc-300">Аналитик:</span> analyst@monitoring.ru / analyst123</p>
                <p><span className="text-zinc-300">Оператор:</span> operator@monitoring.ru / operator123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-600 mt-4">
          © 2024 TransMonitor. Все права защищены.
        </p>
      </div>
    </div>
  )
}
