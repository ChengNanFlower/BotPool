import type { SSEEvent } from "./types";

/** 将 SSEEvent 对象格式化为 SSE 协议文本（event + data 行） */
export function formatSSE(event: SSEEvent): string {
  const lines = [
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.data)}`,
    "",
    "",
  ];
  return lines.join("\n");
}

/** 生成 SSE 注释行（以 : 开头，客户端会忽略，通常用于心跳） */
export function formatSSEComment(comment: string): string {
  return `: ${comment}\n\n`;
}
