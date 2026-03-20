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
    const riskLevel = searchParams.get("riskLevel")
    const isFraud = searchParams.get("isFraud")
    const reviewed = searchParams.get("reviewed")

    const riskScores = await prisma.riskScore.findMany({
      where: {
        AND: [
          riskLevel ? { riskLevel } : {},
          isFraud !== null ? { isFraud: isFraud === "true" } : {},
          reviewed !== null ? { reviewedByAnalyst: reviewed === "true" } : {}
        ]
      },
      include: {
        transaction: {
          include: {
            senderAccount: { include: { client: true } },
            counterparty: true
          }
        }
      },
      orderBy: { scoredAt: "desc" },
      take: 100
    })

    return NextResponse.json(riskScores)
  } catch (error) {
    console.error("Error fetching risk scores:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
