import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/agents/reorder — 批量更新 Agent 排序
 * 接收 orderedIds 数组，在一次事务中按数组下标更新每个 Agent 的 sortOrder
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
    }

    const { orderedIds } = body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds 必须是非空数组" },
        { status: 400 }
      );
    }

    // 事务批量更新，保证原子性
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.agentProfile.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    // 返回排序后的完整列表
    const agents = await prisma.agentProfile.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `排序失败：${message}` }, { status: 500 });
  }
}
