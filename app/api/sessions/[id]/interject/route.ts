import { NextRequest, NextResponse } from "next/server";
import { interjectResolves } from "@/lib/session-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[id]/interject — 用户在一轮结束后插入发言
 *
 * orchestrator 在每轮对话结束后会暂停等待（await Promise），
 * 此接口调用 resolve 来唤醒 orchestrator 并传入用户消息，继续下一轮
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
    }

    const resolve = interjectResolves.get(id);
    if (!resolve) {
      return NextResponse.json(
        { error: "会话未处于等待用户发言状态" },
        { status: 409 },
      );
    }

    resolve(message);  // 唤醒 orchestrator
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `发言失败：${message}` }, { status: 500 });
  }
}
