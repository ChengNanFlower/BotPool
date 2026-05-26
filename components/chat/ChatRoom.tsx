"use client";

import { useState } from "react";
import { useAgents } from "@/hooks/useAgents";
import { useSessions, type SessionDetail } from "@/hooks/useSessions";
import { AgentSidebar } from "@/components/agents/AgentSidebar";
import { ChatView } from "./ChatView";
import { SessionHistory } from "@/components/session/SessionHistory";

/**
 * ChatRoom — 聊天室主布局
 * 三栏结构：左侧 Agent 管理 | 中间对话区 | 右侧历史会话
 */
export function ChatRoom() {
  const { agents, loading, createAgent, updateAgent, deleteAgent } = useAgents();
  const { sessions, loading: sessionsLoading, getSession, deleteSession } = useSessions();

  const [viewingSession, setViewingSession] = useState<SessionDetail | null>(null);

  const handleSelectSession = async (id: string): Promise<SessionDetail | null> => {
    const session = await getSession(id);
    if (session) setViewingSession(session);
    return session;
  };

  const handleCloseHistory = () => {
    setViewingSession(null);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* 左侧：Agent 管理面板 */}
      <AgentSidebar
        agents={agents}
        loading={loading}
        onCreate={createAgent}
        onUpdate={updateAgent}
        onDelete={deleteAgent}
      />

      {/* 中间：对话 / 历史回看 */}
      <ChatView
        viewingSession={viewingSession}
        onCloseHistory={handleCloseHistory}
      />

      {/* 右侧：历史会话列表 */}
      <SessionHistory
        sessions={sessions}
        loading={sessionsLoading}
        activeSessionId={viewingSession?.id}
        onSelect={handleSelectSession}
        onDelete={deleteSession}
      />
    </div>
  );
}
