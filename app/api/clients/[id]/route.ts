import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db-prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - Get client by ID
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
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        accounts: {
          include: {
            sentTransactions: {
              include: { riskScore: true },
              take: 10,
              orderBy: { transactionDate: "desc" }
            },
            receivedTransactions: {
              take: 10,
              orderBy: { transactionDate: "desc" }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update client
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

    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || null,
        passportSeries: data.passportSeries,
        passportNumber: data.passportNumber,
        dateOfBirth: new Date(data.dateOfBirth),
        isBlocked: data.isBlocked,
        scoringScore: data.scoringScore
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Client",
        entityId: String(client.id),
        details: `Обновлён клиент: ${client.fullName}`
      }
    })

    return NextResponse.json(client)
  } catch (error: any) {
    console.error("Error updating client:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Клиент с такими данными уже существует" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete client
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
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    await prisma.client.delete({
      where: { id: parseInt(id) }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Client",
        entityId: String(id),
        details: `Удалён клиент: ${client.fullName}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
