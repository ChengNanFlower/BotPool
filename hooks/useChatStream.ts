"use client";

import { useState, useCallback, useRef } from "react";
import type { SSEMessage } from "./useSSE";

// ---- 聊天消息数据结构 ----
export interface ChatMessage {
  id: string;
  agentId: string | null;
  displayName?: string;
  provider?: string;
  role: "user" | "assistant" | "system";
  content: string;
  sequenceNum: number;
  roundNum: number;
  isStreaming?: boolean;   // 是否正在流式接收中
  isError?: boolean;
  errorMessage?: string;
  cost?: number;
  usage?: { promptTokens: number; outputTokens: number; cost: number };
}

// ---- 聊天状态机 ----
interface ChatState {
  messages: ChatMessage[];
  status: "idle" | "connecting" | "streaming" | "paused" | "stopped" | "error";
  currentAgentId: string | null;
  currentDisplayName: string | null;
  currentProvider: string | null;
  roundNum: number;
  totalCost: number;
}

/**
 * useChatStream — 聊天流式消息管理 hook
 * 此 hook 是前端 SSE 事件处理的核心，
 * 将后端推送的各类事件（token / message_complete / round_paused 等）映射为 UI 状态
 */
export function useChatStream() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    status: "idle",
    currentAgentId: null,
    currentDisplayName: null,
    currentProvider: null,
    roundNum: 0,
    totalCost: 0,
  });

  const abortRef = useRef<AbortController | null>(null);

  /**
   * 启动 SSE 流，处理所有事件类型并更新状态
   * @param sessionId 会话 ID
   * @param fetchSSE   SSE 连接函数（来自 useSSE hook）
   */
  const startStream = useCallback(
    async (sessionId: string, fetchSSE: (id: string, signal: AbortSignal) => AsyncGenerator<SSEMessage>) => {
      const controller = new AbortController();
      abortRef.current = controller;

      setState((s) => ({ ...s, status: "connecting", messages: [] }));

      try {
        // 逐事件处理
        for await (const event of fetchSSE(sessionId, controller.signal)) {
          const { type, data } = event;

          setState((prev) => {
            switch (type) {
              case "session_start":
                return {
                  ...prev,
                  status: "streaming",
                  currentAgentId: null,
                  currentDisplayName: null,
                  currentProvider: null,
                };

              case "agent_thinking":
                return {
                  ...prev,
                  currentAgentId: data.agentId as string,
                  currentDisplayName: data.displayName as string,
                  currentProvider: data.provider as string,
                };

              case "token":
                // 收到增量 token：追加到当前流式消息或创建新消息
                return {
                  ...prev,
                  messages: appendToken(
                    prev.messages,
                    data.agentId as string,
                    (data.displayName as string) || prev.currentDisplayName || "",
                    (data.provider as string) || prev.currentProvider || "",
                    data.token as string,
                    data.sequenceNum as number,
                  ),
                };

              case "message_complete":
                // Agent 发言完成：将流式消息标记为完成，附上持久化 ID 和用量
                return {
                  ...prev,
                  currentAgentId: null,
                  currentDisplayName: null,
                  currentProvider: null,
                  messages: completeMessage(
                    prev.messages,
                    data.agentId as string,
                    data.displayName as string,
                    data.provider as string,
                    {
                      id: data.messageId as string,
                      content: data.content as string,
                      sequenceNum: data.sequenceNum as number,
                      roundNum: data.roundNum as number,
                      usage: data.usage as ChatMessage["usage"],
                    },
                  ),
                };

              case "agent_error":
                return {
                  ...prev,
                  currentAgentId: null,
                  currentDisplayName: null,
                  currentProvider: null,
                  messages: markError(
                    prev.messages,
                    data.agentId as string,
                    data.error as string,
                  ),
                };

              case "agent_disabled":
                return prev;  // 仅通知，UI 可以通过其他方式展示

              case "round_complete":
                return {
                  ...prev,
                  roundNum: data.roundNum as number,
                  totalCost: data.sessionCost as number,
                };

              case "round_paused":
                // 轮次结束暂停，等待用户插话
                return { ...prev, status: "paused" as const, roundNum: data.roundNum as number };

              case "user_interjected":
                // 用户插话已保存，恢复 streaming
                return {
                  ...prev,
                  status: "streaming" as const,
                  messages: [
                    ...prev.messages,
                    {
                      id: `user-${Date.now()}`,
                      agentId: null,
                      role: "user" as const,
                      content: data.content as string,
                      sequenceNum: prev.messages.length + 1,
                      roundNum: data.roundNum as number,
                    },
                  ],
                };

              case "session_stopped":
              case "session_error":
                return {
                  ...prev,
                  status: type === "session_error" ? "error" : "stopped",
                  currentAgentId: null,
                  currentDisplayName: null,
                  currentProvider: null,
                };

              case "heartbeat":
                return prev;  // 心跳忽略

              default:
                return prev;
            }
          });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setState((s) => ({ ...s, status: "stopped" }));
        } else {
          setState((s) => ({
            ...s,
            status: "error",
          }));
        }
      }
    },
    [],
  );

  // 停止会话
  const stopStream = useCallback(async (sessionId: string) => {
    abortRef.current?.abort();
    await fetch(`/api/sessions/${sessionId}/stop`, { method: "POST" });
  }, []);

  // 跳过当前发言的 Agent
  const skipAgent = useCallback(async (sessionId: string) => {
    await fetch(`/api/sessions/${sessionId}/skip`, { method: "POST" });
  }, []);

  // 重置为初始状态
  const reset = useCallback(() => {
    setState({
      messages: [],
      status: "idle",
      currentAgentId: null,
      currentDisplayName: null,
      currentProvider: null,
      roundNum: 0,
      totalCost: 0,
    });
  }, []);

  return { state, startStream, stopStream, skipAgent, reset };
}

// ---- 纯函数：消息列表操作（不修改原数组） ----

/** 在消息列表中追加增量 token；若最后一条是该 Agent 的流式消息则拼接，否则新建 */
function appendToken(
  messages: ChatMessage[],
  agentId: string,
  displayName: string,
  provider: string,
  token: string,
  seqNum: number,
): ChatMessage[] {
  const last = messages[messages.length - 1];
  if (last?.agentId === agentId && last.isStreaming) {
    return [
      ...messages.slice(0, -1),
      { ...last, content: last.content + token },
    ];
  }
  return [
    ...messages,
    {
      id: `streaming-${agentId}-${seqNum}`,
      agentId,
      displayName,
      provider,
      role: "assistant" as const,
      content: token,
      sequenceNum: seqNum,
      roundNum: 0,
      isStreaming: true,
    },
  ];
}

/** 将某 Agent 的流式消息标记为完成，写入数据库 ID 和用量 */
function completeMessage(
  messages: ChatMessage[],
  agentId: string,
  displayName: string | undefined,
  provider: string | undefined,
  data: {
    id: string;
    content: string;
    sequenceNum: number;
    roundNum: number;
    usage?: ChatMessage["usage"];
  },
): ChatMessage[] {
  return messages.map((m) => {
    if (m.agentId === agentId && m.isStreaming) {
      return {
        ...m,
        id: data.id,
        displayName: displayName || m.displayName,
        provider: provider || m.provider,
        content: data.content,
        sequenceNum: data.sequenceNum,
        roundNum: data.roundNum,
        isStreaming: false,
        usage: data.usage,
      };
    }
    return m;
  });
}

/** 将某 Agent 的流式消息标记为错误 */
function markError(
  messages: ChatMessage[],
  agentId: string,
  error: string,
): ChatMessage[] {
  return messages.map((m) => {
    if (m.agentId === agentId && m.isStreaming) {
      return { ...m, isStreaming: false, isError: true, errorMessage: error };
    }
    return m;
  });
}
