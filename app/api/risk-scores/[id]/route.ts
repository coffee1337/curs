import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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

    const riskScore = await prisma.riskScore.update({
      where: { id: parseInt(id) },
      data: {
        reviewedByAnalyst: true,
        analystComment: data.analystComment,
        isFraud: data.isFraud
      },
      include: {
        transaction: {
          include: {
            senderAccount: { include: { client: true } }
          }
        }
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "RiskScore",
        entityId: String(riskScore.id),
        details: `Обновлён риск-скор для транзакции #${riskScore.transactionId}`
      }
    })

    return NextResponse.json(riskScore)
  } catch (error) {
    console.error("Error updating risk score:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
