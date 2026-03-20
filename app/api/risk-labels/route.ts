import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const labels = await prisma.riskLabel.findMany({
      include: {
        _count: { select: { transactions: true } }
      },
      orderBy: { severity: "desc" }
    })

    return NextResponse.json(labels)
  } catch (error) {
    console.error("Error fetching risk labels:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const label = await prisma.riskLabel.create({
      data: {
        labelName: data.labelName,
        description: data.description,
        severity: data.severity || "Medium"
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "RiskLabel",
        entityId: String(label.id),
        details: `Создана метка риска: ${label.labelName}`
      }
    })

    return NextResponse.json(label)
  } catch (error: any) {
    console.error("Error creating risk label:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Метка с таким названием уже существует" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
