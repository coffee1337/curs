import { NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Total transactions amount
    const totalAmount = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "Completed" }
    })

    // Transaction counts by status
    const completedCount = await prisma.transaction.count({
      where: { status: "Completed" }
    })
    const rejectedCount = await prisma.transaction.count({
      where: { status: "Rejected" }
    })
    const processingCount = await prisma.transaction.count({
      where: { status: "Processing" }
    })

    // Risk level distribution
    const lowRiskCount = await prisma.riskScore.count({
      where: { riskLevel: "Low" }
    })
    const mediumRiskCount = await prisma.riskScore.count({
      where: { riskLevel: "Medium" }
    })
    const highRiskCount = await prisma.riskScore.count({
      where: { riskLevel: "High" }
    })
    const criticalRiskCount = await prisma.riskScore.count({
      where: { riskLevel: "Critical" }
    })

    // Fraud statistics
    const fraudCount = await prisma.riskScore.count({
      where: { isFraud: true }
    })
    const reviewedCount = await prisma.riskScore.count({
      where: { reviewedByAnalyst: true }
    })
    const unreviewedHighRisk = await prisma.riskScore.count({
      where: {
        reviewedByAnalyst: false,
        riskLevel: { in: ["High", "Critical"] }
      }
    })

    // Client statistics
    const totalClients = await prisma.client.count()
    const blockedClients = await prisma.client.count({
      where: { isBlocked: true }
    })

    // Account statistics
    const totalAccounts = await prisma.account.count()
    const activeAccounts = await prisma.account.count({
      where: { status: "Active" }
    })
    const frozenAccounts = await prisma.account.count({
      where: { status: "Frozen" }
    })

    // Counterparty statistics
    const totalCounterparties = await prisma.counterparty.count()
    const blacklistedCounterparties = await prisma.counterparty.count({
      where: { isBlacklisted: true }
    })

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { transactionDate: "desc" },
      include: {
        senderAccount: { include: { client: true } },
        counterparty: true,
        riskScore: true
      }
    })

    // Top clients by transaction count
    const topClients = await prisma.client.findMany({
      take: 5,
      include: {
        accounts: {
          include: {
            _count: { select: { sentTransactions: true } }
          }
        }
      }
    })

    const topClientsByTransactions = topClients.map(client => ({
      id: client.id,
      fullName: client.fullName,
      transactionCount: client.accounts.reduce((sum, acc) => sum + acc._count.sentTransactions, 0),
      scoringScore: client.scoringScore
    })).sort((a, b) => b.transactionCount - a.transactionCount)

    // Transactions by type
    const transactionsByType = await prisma.transaction.groupBy({
      by: ['transactionType'],
      _count: true,
      _sum: { amount: true }
    })

    // Recent fraud transactions
    const recentFraud = await prisma.riskScore.findMany({
      where: { isFraud: true },
      take: 5,
      orderBy: { scoredAt: "desc" },
      include: {
        transaction: {
          include: {
            senderAccount: { include: { client: true } }
          }
        }
      }
    })

    return NextResponse.json({
      totalAmount: totalAmount._sum.amount || 0,
      transactionStats: {
        completed: completedCount,
        rejected: rejectedCount,
        processing: processingCount
      },
      riskDistribution: {
        low: lowRiskCount,
        medium: mediumRiskCount,
        high: highRiskCount,
        critical: criticalRiskCount
      },
      fraudStats: {
        fraudCount,
        reviewedCount,
        unreviewedHighRisk
      },
      clientStats: {
        total: totalClients,
        blocked: blockedClients
      },
      accountStats: {
        total: totalAccounts,
        active: activeAccounts,
        frozen: frozenAccounts
      },
      counterpartyStats: {
        total: totalCounterparties,
        blacklisted: blacklistedCounterparties
      },
      recentTransactions,
      topClients: topClientsByTransactions,
      transactionsByType,
      recentFraud
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
