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
    const search = searchParams.get("search") || ""
    const riskLevel = searchParams.get("riskLevel")
    const isBlacklisted = searchParams.get("isBlacklisted")

    const counterparties = await prisma.counterparty.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { name: { contains: search } },
              { taxId: { contains: search } },
              { activityCategory: { contains: search } },
            ]
          } : {},
          riskLevel ? { riskLevel } : {},
          isBlacklisted !== null ? { isBlacklisted: isBlacklisted === "true" } : {}
        ]
      },
      orderBy: { addedDate: "desc" }
    })

    return NextResponse.json(counterparties)
  } catch (error) {
    console.error("Error fetching counterparties:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "Operator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const counterparty = await prisma.counterparty.create({
      data: {
        name: data.name,
        taxId: data.taxId,
        activityCategory: data.activityCategory,
        riskLevel: data.riskLevel || "Low",
        isBlacklisted: data.isBlacklisted || false,
        countryOfRegistry: data.countryOfRegistry || "Russia"
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Counterparty",
        entityId: String(counterparty.id),
        details: `Создан контрагент: ${counterparty.name}`
      }
    })

    return NextResponse.json(counterparty)
  } catch (error: any) {
    console.error("Error creating counterparty:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Контрагент с таким ИНН уже существует" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
