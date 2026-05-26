"use client";

import { useCallback, useRef } from "react";

// ---- 从 SSE 解析出的事件结构 ----
export interface SSEMessage {
  type: string;
  data: Record<string, unknown>;
}

/**
 * useSSE — SSE (Server-Sent Events) 连接管理 hook
 * 封装了 async generator 模式的 SSE 解析逻辑，
 * 提供 connect（建立长连接）和 disconnect（断开）操作
 */
export function useSSE() {
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  /**
   * 建立 SSE 连接，返回一个 async generator
   * 逐条解析 SSE 事件（event + data），yield { type, data }
   */
  const connect = useCallback(
    async function* (
      sessionId: string,
      signal: AbortSignal,
    ): AsyncGenerator<SSEMessage> {
      // 请求 start 接口获取 SSE 流
      const response = await fetch(`/api/sessions/${sessionId}/start`, {
        method: "POST",
        signal,
        headers: { Accept: "text/event-stream" },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Connection failed" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      // 读取 SSE 字节流
      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 按 \n\n 分隔 SSE 事件块
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            // 解析 event: 和 data: 行
            const lines = trimmed.split("\n");
            let eventType = "message";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              }
            }

            if (eventData) {
              try {
                yield {
                  type: eventType,
                  data: JSON.parse(eventData),
                };
              } catch {
                // skip unparseable
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    [],
  );

  // 断开 SSE 连接
  const disconnect = useCallback(() => {
    controllerRef.current?.abort();
    readerRef.current?.cancel().catch(() => {});
  }, []);

  return { connect, disconnect, readerRef, controllerRef };
}
