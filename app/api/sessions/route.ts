import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/sessions — 获取所有会话摘要列表（按创建时间倒序，不含消息内容）
 */
export async function GET() {
  try {
    const sessions = await prisma.chatSession.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        topic: true,
        status: true,
        roundCount: true,
        totalCost: true,
        createdAt: true,
      },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    console.error("[GET /api/sessions]", message);
    return NextResponse.json({ error: `查询失败：${message}` }, { status: 500 });
  }
}

/**
 * POST /api/sessions — 创建新会话
 * 同时创建第一条系统 USER 消息（即用户输入的话题）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
    }

    const { topic } = body;
    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "话题不能为空" }, { status: 400 });
    }

    // 确保至少有 2 个启用的 Agent
    const agents = await prisma.agentProfile.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });

    if (agents.length < 2) {
      return NextResponse.json(
        { error: "至少需要 2 个已启用的角色" },
        { status: 400 }
      );
    }

    // 创建会话 + 首条用户消息（一条写操作）
    const session = await prisma.chatSession.create({
      data: {
        topic,
        messages: {
          create: {
            role: "USER",
            content: topic,
            sequenceNum: 1,
            roundNum: 0,
          },
        },
      },
      include: { messages: true },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    console.error("[POST /api/sessions]", message);
    return NextResponse.json({ error: `创建失败：${message}` }, { status: 500 });
  }
}
