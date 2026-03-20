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
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        senderAccount: { include: { client: true } },
        receiverAccount: { include: { client: true } },
        counterparty: true,
        riskScore: true,
        labels: { include: { label: true } }
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error fetching transaction:", error)
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

    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        status: data.status,
        description: data.description
      },
      include: {
        senderAccount: { include: { client: true } },
        counterparty: true
      }
    })

    // Update risk score if provided
    if (data.riskScoreUpdate) {
      await prisma.riskScore.update({
        where: { transactionId: parseInt(id) },
        data: {
          reviewedByAnalyst: true,
          analystComment: data.analystComment,
          isFraud: data.isFraud
        }
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Transaction",
        entityId: String(transaction.id),
        details: `Обновлена транзакция #${transaction.id}`
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
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

    await prisma.transaction.delete({
      where: { id: parseInt(id) }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Transaction",
        entityId: String(id),
        details: `Удалена транзакция #${id}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
