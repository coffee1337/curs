import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const account = await prisma.account.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        sentTransactions: {
          include: { riskScore: true, counterparty: true },
          take: 20,
          orderBy: { transactionDate: "desc" }
        },
        receivedTransactions: {
          take: 20,
          orderBy: { transactionDate: "desc" }
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "Operator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const account = await prisma.account.update({
      where: { id: parseInt(id) },
      data: {
        balance: parseFloat(data.balance),
        status: data.status,
        accountType: data.accountType
      },
      include: { client: true }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Account",
        entityId: String(account.id),
        details: `Обновлён счёт ${account.accountNumber}`
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error("Error updating account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const account = await prisma.account.findUnique({
      where: { id: parseInt(id) }
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    await prisma.account.delete({
      where: { id: parseInt(id) }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Account",
        entityId: String(id),
        details: `Удалён счёт ${account.accountNumber}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
