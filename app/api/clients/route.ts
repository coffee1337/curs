import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - List all clients
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const isBlocked = searchParams.get("isBlocked")

    const clients = await prisma.client.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { fullName: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ]
          } : {},
          isBlocked !== null ? { isBlocked: isBlocked === "true" } : {}
        ]
      },
      include: {
        accounts: true
      },
      orderBy: { registrationDate: "desc" }
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "Operator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const client = await prisma.client.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || null,
        passportSeries: data.passportSeries,
        passportNumber: data.passportNumber,
        dateOfBirth: new Date(data.dateOfBirth),
        isBlocked: data.isBlocked || false,
        scoringScore: data.scoringScore || 0.5
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Client",
        entityId: String(client.id),
        details: `Создан клиент: ${client.fullName}`
      }
    })

    return NextResponse.json(client)
  } catch (error: any) {
    console.error("Error creating client:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Клиент с такими данными уже существует" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
