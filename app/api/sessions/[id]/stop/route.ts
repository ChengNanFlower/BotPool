import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeSessions } from "@/lib/session-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[id]/stop — 停止正在运行的会话
 * 触发会话级 AbortController，orchestrator 检测到信号后会保存当前进度并退出
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const controller = activeSessions.get(id);
    if (controller) {
      controller.abort();
      activeSessions.delete(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `停止失败：${message}` }, { status: 500 });
  }
}
