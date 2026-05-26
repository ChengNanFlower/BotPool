"use client";

import { useState, useRef } from "react";
import { useAgents } from "@/hooks/useAgents";
import { useSessions, type SessionDetail } from "@/hooks/useSessions";
import { useSSE } from "@/hooks/useSSE";
import { useChatStream } from "@/hooks/useChatStream";
import { useScreenshot } from "@/hooks/useScreenshot";
import { MessageList } from "./MessageList";
import { StatusBar } from "./StatusBar";
import { ChatControls } from "./ChatControls";
import { TopicInput } from "./TopicInput";
import { ExportMenu } from "@/components/export/ExportMenu";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface Props {
  viewingSession?: SessionDetail | null;
  onCloseHistory?: () => void;
}

/**
 * ChatView — 对话区主组件
 *
 * 两种模式：
 * 1. 实时对话模式：输入话题 → 启动 SSE 流 → 渲染实时消息 + 暂停插话
 * 2. 历史回看模式：查看已完成会话的消息记录
 */
export function ChatView({ viewingSession, onCloseHistory }: Props) {
  const { agents } = useAgents();
  const { createSession, getSession } = useSessions();
  const { connect } = useSSE();
  const { state, startStream, stopStream, skipAgent, reset } = useChatStream();
  const { capture } = useScreenshot();

  const messageAreaRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [interjectMsg, setInterjectMsg] = useState("");

  // 派生状态
  const isActive = state.status === "streaming" || state.status === "connecting";
  const isPaused = state.status === "paused";
  const canStart = topic.trim() && agents.length >= 2 && state.status === "idle";
  const hasVisibleMessages = viewingSession
    ? viewingSession.messages.length > 0
    : state.messages.length > 0;

  // ---- 事件处理 ----

  /** 开始对话：创建会话 → 连接 SSE 流 */
  const handleStart = async () => {
    if (!canStart) return;
    setStartError(null);
    try {
      const session = await createSession(topic);
      setSessionId(session.id);
      setTopic("");
      await startStream(session.id, connect);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "启动失败";
      setStartError(msg);
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    await stopStream(sessionId);
  };

  const handleSkip = async () => {
    if (!sessionId) return;
    await skipAgent(sessionId);
  };

  /** 重置状态，准备新会话 */
  const handleNew = () => {
    reset();
    setSessionId(null);
    setTopic("");
    setInterjectMsg("");
  };

  const handleScreenshot = () => {
    if (messageAreaRef.current) {
      capture(messageAreaRef.current);
    }
  };

  /** 用户在一轮结束后插话 */
  const handleInterject = async () => {
    if (!sessionId || !interjectMsg.trim()) return;
    await fetch(`/api/sessions/${sessionId}/interject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: interjectMsg.trim() }),
    });
    setInterjectMsg("");
  };

  // ======== 历史回看模式 ========
  if (viewingSession) {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* 回看顶部栏 */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-white">
          <Button variant="ghost" size="sm" onClick={onCloseHistory}>
            ← 返回
          </Button>
          <span className="text-sm font-medium text-gray-700 truncate">
            {viewingSession.topic || "未命名"}
          </span>
          <span className="text-xs text-gray-400">
            第 {viewingSession.roundCount} 轮 · ${(viewingSession.totalCost || 0).toFixed(6)}
          </span>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <MessageList
            messages={viewingSession.messages.map((m) => ({
              id: m.id,
              agentId: m.agentId,
              displayName: m.agent?.displayName || (m as Record<string,unknown>).agentDisplayName as string,
              provider: m.agent?.provider || (m as Record<string,unknown>).agentProvider as string,
              role: m.role as "user" | "assistant",
              content: m.content,
              sequenceNum: m.sequenceNum,
              roundNum: m.roundNum,
              isError: m.isError,
              cost: m.cost,
              usage: m.cost != null ? { promptTokens: 0, outputTokens: 0, cost: m.cost } : undefined,
            }))}
          />
        </div>
      </div>
    );
  }

  // ======== 实时对话模式 ========
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 状态栏：当前发言人、轮次、费用 */}
      <StatusBar
        roundNum={state.roundNum}
        totalCost={state.totalCost}
        currentAgentName={state.currentDisplayName}
        status={state.status}
      />

      {/* 消息区域（可截图区域） */}
      <div ref={messageAreaRef} className="flex-1 overflow-hidden flex flex-col">
        <MessageList messages={state.messages} />
      </div>

      {/* 底部控制区：根据状态显示不同控件 */}
      <div className="border-t border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            {/* 空闲态：话题输入 + 开始按钮 */}
            {state.status === "idle" && (
              <div className="flex flex-col gap-3">
                <TopicInput value={topic} onChange={setTopic} disabled={false} />
                {startError && (
                  <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-600 text-xs">
                    {startError}
                  </div>
                )}
                <ChatControls
                  status={state.status}
                  onStart={handleStart}
                  onStop={handleStop}
                  onSkip={handleSkip}
                  disabled={!canStart}
                />
              </div>
            )}

            {/* 暂停态：等待用户插话 */}
            {isPaused && (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-500">
                  第 {state.roundNum} 轮结束 — 输入你的发言，让对话继续
                </div>
                <div className="flex gap-2">
                  <Textarea
                    rows={1}
                    value={interjectMsg}
                    onChange={(e) => setInterjectMsg(e.target.value)}
                    placeholder="说点什么，或者留空继续..."
                    disabled={false}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleInterject();
                      }
                    }}
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleInterject}
                      disabled={!interjectMsg.trim()}
                    >
                      继续
                    </Button>
                    <Button variant="danger" size="md" onClick={handleStop}>
                      停止
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 结束/错误态：新会话按钮 */}
            {(state.status === "stopped" || state.status === "error") && (
              <ChatControls
                status={state.status}
                onStart={handleNew}
                onStop={handleStop}
                onSkip={handleSkip}
                disabled={false}
              />
            )}

            {/* 活跃态：停止 + 跳过按钮 */}
            {isActive && (
              <ChatControls
                status={state.status}
                onStart={handleStart}
                onStop={handleStop}
                onSkip={handleSkip}
                disabled={false}
              />
            )}
          </div>

          {/* 导出菜单：MD 下载 / 截长图 */}
          {(hasVisibleMessages || isPaused) && (
            <ExportMenu
              sessionId={sessionId}
              onScreenshot={handleScreenshot}
              disabled={isActive}
            />
          )}
        </div>
      </div>
    </div>
  );
}
