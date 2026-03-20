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
    if (!session || session.user.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const label = await prisma.riskLabel.update({
      where: { id: parseInt(id) },
      data: {
        labelName: data.labelName,
        description: data.description,
        severity: data.severity
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "RiskLabel",
        entityId: String(label.id),
        details: `Обновлена метка риска: ${label.labelName}`
      }
    })

    return NextResponse.json(label)
  } catch (error) {
    console.error("Error updating risk label:", error)
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
    const label = await prisma.riskLabel.findUnique({
      where: { id: parseInt(id) }
    })

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 })
    }

    await prisma.riskLabel.delete({
      where: { id: parseInt(id) }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "RiskLabel",
        entityId: String(id),
        details: `Удалена метка риска: ${label.labelName}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting risk label:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
