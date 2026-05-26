import { NextRequest, NextResponse } from "next/server";
import { activeAgentStreams } from "@/lib/session-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[id]/skip — 跳过当前正在发言的 Agent
 * 触发 Agent 级 AbortController，让 orchestrator 中断当前 Agent 并转向下一个
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const agentController = activeAgentStreams.get(id);
    if (agentController) {
      agentController.abort();
      activeAgentStreams.delete(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `跳过失败：${message}` }, { status: 500 });
  }
}
