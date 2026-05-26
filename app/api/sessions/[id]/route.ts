import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/sessions/[id] — 查询单个会话详情（含全部消息及发言人信息）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { sequenceNum: "asc" },
          include: {
            agent: {
              select: { id: true, displayName: true, provider: true },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `查询失败：${message}` }, { status: 500 });
  }
}

/**
 * DELETE /api/sessions/[id] — 删除会话（级联删除所有关联消息）
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.chatSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    await prisma.chatSession.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `删除失败：${message}` }, { status: 500 });
  }
}
