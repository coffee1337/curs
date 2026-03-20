import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - List all accounts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const accountType = searchParams.get("accountType")

    const accounts = await prisma.account.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { accountNumber: { contains: search } },
              { client: { fullName: { contains: search } } },
            ]
          } : {},
          status ? { status } : {},
          accountType ? { accountType } : {}
        ]
      },
      include: {
        client: true
      },
      orderBy: { openDate: "desc" }
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "Operator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const account = await prisma.account.create({
      data: {
        clientId: parseInt(data.clientId),
        accountNumber: data.accountNumber,
        balance: parseFloat(data.balance) || 0,
        currency: data.currency || "RUB",
        openDate: new Date(data.openDate || Date.now()),
        status: data.status || "Active",
        accountType: data.accountType
      },
      include: { client: true }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Account",
        entityId: String(account.id),
        details: `Создан счёт ${account.accountNumber} для клиента ${account.client?.fullName}`
      }
    })

    return NextResponse.json(account)
  } catch (error: any) {
    console.error("Error creating account:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Счёт с таким номером уже существует" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
