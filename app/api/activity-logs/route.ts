import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")
    const userId = searchParams.get("userId")

    const logs = await prisma.activityLog.findMany({
      where: {
        AND: [
          action ? { action } : {},
          entityType ? { entityType } : {},
          userId ? { userId } : {}
        ]
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 200
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
