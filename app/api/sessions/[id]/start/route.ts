import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRoundRobin } from "@/lib/orchestrator";
import { activeSessions } from "@/lib/session-store";
import type { SSEEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[id]/start — 启动会话 SSE 流
 *
 * 这是整个应用的核心接口：创建一个 SSE (Server-Sent Events) 长连接，
 * 通过 ReadableStream 实时推送 orchestrator 产生的每一帧事件给前端。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 验证会话存在
  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { sequenceNum: "asc" } },
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // 防止重复启动
  if (session.status === "ACTIVE") {
    return Response.json(
      { error: "Session is already active" },
      { status: 409 },
    );
  }

  // 获取所有启用的 Agent
  const agents = await prisma.agentProfile.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });

  if (agents.length < 2) {
    return Response.json(
      { error: "At least 2 enabled agents required" },
      { status: 400 },
    );
  }

  // 标记会话为 ACTIVE
  await prisma.chatSession.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  // 注册会话级 AbortController，供 stop API 使用
  const abortController = new AbortController();
  activeSessions.set(id, abortController);

  // 客户端断开连接时自动清理
  request.signal.addEventListener("abort", () => {
    abortController.abort();
    activeSessions.delete(id);
  });

  // ---- 构建 SSE ReadableStream ----
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      /** 将 SSEEvent 编码为 SSE 协议文本并写入流 */
      function sendEvent(event: SSEEvent) {
        const lines = [
          `event: ${event.type}`,
          `data: ${JSON.stringify(event.data)}`,
          "",
          "",
        ].join("\n");
        controller.enqueue(encoder.encode(lines));
      }

      // 每 15 秒发送心跳（SSE 注释，防止代理/负载均衡器超时断开）
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        // 核心：运行轮转编排器，把每个事件推送到 SSE 流
        for await (const event of runRoundRobin(
          session,
          agents,
          abortController.signal,
        )) {
          sendEvent(event);
        }
      } catch (error) {
        sendEvent({
          type: "session_error",
          data: {
            sessionId: id,
            error: error instanceof Error ? error.message : "Internal error",
          },
        });
      } finally {
        clearInterval(heartbeat);
        activeSessions.delete(id);
        controller.close();
      }
    },
  });

  // 返回 SSE 响应
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",  // 禁用 nginx 缓冲
    },
  });
}
