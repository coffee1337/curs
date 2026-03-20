import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - List all transactions with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const transactionType = searchParams.get("transactionType")
    const riskLevel = searchParams.get("riskLevel")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const minAmount = searchParams.get("minAmount")
    const maxAmount = searchParams.get("maxAmount")
    const clientId = searchParams.get("clientId")
    const counterpartyId = searchParams.get("counterpartyId")

    const transactions = await prisma.transaction.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { description: { contains: search } },
              { senderAccount: { accountNumber: { contains: search } } },
              { senderAccount: { client: { fullName: { contains: search } } } },
            ]
          } : {},
          status ? { status } : {},
          transactionType ? { transactionType } : {},
          riskLevel ? { riskScore: { riskLevel } } : {},
          dateFrom ? { transactionDate: { gte: new Date(dateFrom) } } : {},
          dateTo ? { transactionDate: { lte: new Date(dateTo) } } : {},
          minAmount ? { amount: { gte: parseFloat(minAmount) } } : {},
          maxAmount ? { amount: { lte: parseFloat(maxAmount) } } : {},
          clientId ? { senderAccount: { clientId: parseInt(clientId) } } : {},
          counterpartyId ? { counterpartyId: parseInt(counterpartyId) } : {}
        ]
      },
      include: {
        senderAccount: { include: { client: true } },
        receiverAccount: { include: { client: true } },
        counterparty: true,
        riskScore: true,
        labels: { include: { label: true } }
      },
      orderBy: { transactionDate: "desc" },
      take: 100
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === "Operator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const transaction = await prisma.transaction.create({
      data: {
        senderAccountId: parseInt(data.senderAccountId),
        receiverAccountId: data.receiverAccountId ? parseInt(data.receiverAccountId) : null,
        counterpartyId: data.counterpartyId ? parseInt(data.counterpartyId) : null,
        amount: parseFloat(data.amount),
        transactionDate: new Date(data.transactionDate || Date.now()),
        transactionType: data.transactionType,
        status: data.status || "Completed",
        description: data.description,
        ipAddress: data.ipAddress,
        deviceId: data.deviceId
      },
      include: {
        senderAccount: { include: { client: true } },
        receiverAccount: { include: { client: true } },
        counterparty: true
      }
    })

    // Calculate risk score (simplified ML model simulation)
    const riskScoreValue = calculateRiskScore(transaction, data)
    const riskLevel = getRiskLevelFromScore(riskScoreValue)

    const riskScore = await prisma.riskScore.create({
      data: {
        transactionId: transaction.id,
        riskScoreValue,
        riskLevel,
        modelVersion: "XGBoost_v1.3",
        featureVectorJson: JSON.stringify({
          amount: transaction.amount,
          hour: new Date(transaction.transactionDate).getHours(),
          type: transaction.transactionType
        })
      }
    })

    // Create notification for high risk transactions
    if (riskLevel === "High" || riskLevel === "Critical") {
      await prisma.notification.create({
        data: {
          type: riskLevel === "Critical" ? "error" : "warning",
          title: `${riskLevel === "Critical" ? "Критическая" : "Подозрительная"} транзакция`,
          message: `Транзакция #${transaction.id} на сумму ${transaction.amount} RUB имеет риск-скор ${riskScoreValue.toFixed(2)}`,
          isRead: false,
          link: `/transactions?id=${transaction.id}`
        }
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Transaction",
        entityId: String(transaction.id),
        details: `Создана транзакция #${transaction.id} на сумму ${transaction.amount} RUB`
      }
    })

    return NextResponse.json({ ...transaction, riskScore })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateRiskScore(transaction: any, data: any): number {
  let score = 0.1

  // Amount factor
  if (transaction.amount > 100000) score += 0.2
  if (transaction.amount > 500000) score += 0.3

  // Time factor (night transactions)
  const hour = new Date(transaction.transactionDate).getHours()
  if (hour >= 0 && hour < 5) score += 0.2

  // Counterparty risk
  if (data.counterpartyRiskLevel === "High") score += 0.3
  if (data.counterpartyBlacklisted) score += 0.4

  // Client risk
  if (data.clientBlocked) score += 0.5
  if (data.clientScoringScore > 0.5) score += 0.1

  return Math.min(score, 0.99)
}

function getRiskLevelFromScore(score: number): string {
  if (score < 0.2) return "Low"
  if (score < 0.5) return "Medium"
  if (score < 0.8) return "High"
  return "Critical"
}
