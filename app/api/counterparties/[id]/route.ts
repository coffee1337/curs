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
    const counterparty = await prisma.counterparty.findUnique({
      where: { id: parseInt(id) },
      include: {
        transactions: {
          include: {
            senderAccount: { include: { client: true } },
            riskScore: true
          },
          take: 20,
          orderBy: { transactionDate: "desc" }
        }
      }
    })

    if (!counterparty) {
      return NextResponse.json({ error: "Counterparty not found" }, { status: 404 })
    }

    return NextResponse.json(counterparty)
  } catch (error) {
    console.error("Error fetching counterparty:", error)
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

    const counterparty = await prisma.counterparty.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        taxId: data.taxId,
        activityCategory: data.activityCategory,
        riskLevel: data.riskLevel,
        isBlacklisted: data.isBlacklisted,
        countryOfRegistry: data.countryOfRegistry
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Counterparty",
        entityId: String(counterparty.id),
        details: `Обновлён контрагент: ${counterparty.name}`
      }
    })

    return NextResponse.json(counterparty)
  } catch (error) {
    console.error("Error updating counterparty:", error)
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
    const counterparty = await prisma.counterparty.findUnique({
      where: { id: parseInt(id) }
    })

    if (!counterparty) {
      return NextResponse.json({ error: "Counterparty not found" }, { status: 404 })
    }

    await prisma.counterparty.delete({
      where: { id: parseInt(id) }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Counterparty",
        entityId: String(id),
        details: `Удалён контрагент: ${counterparty.name}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting counterparty:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
