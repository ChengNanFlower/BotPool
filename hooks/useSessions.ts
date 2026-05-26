"use client";

import { useState, useEffect, useCallback } from "react";

// ---- 会话摘要（用于列表展示） ----
export interface SessionSummary {
  id: string;
  topic: string;
  status: string;
  roundCount: number;
  totalCost: number;
  createdAt: string;
}

// ---- 会话详情（含全部消息） ----
export interface SessionDetail {
  id: string;
  topic: string;
  status: string;
  roundCount: number;
  totalCost: number;
  createdAt: string;
  messages: {
    id: string;
    agentId: string | null;
    role: string;
    content: string;
    sequenceNum: number;
    roundNum: number;
    cost: number;
    isError: boolean;
    agent?: { id: string; displayName: string; provider: string };
    agentDisplayName?: string | null;
    agentProvider?: string | null;
  }[];
}

/** 安全解析 JSON 响应，解析失败时返回错误信息 */
async function safeJson(res: Response) {
  try { return await res.json(); } catch {
    return { error: `服务器返回了异常响应 (HTTP ${res.status})` };
  }
}

/**
 * useSessions — 会话管理 hook
 * 管理会话列表的获取、创建、详情查询、删除
 */
export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // 拉取会话摘要列表
  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      setSessions(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 创建新会话（指定话题）
  const createSession = async (topic: string) => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    await fetchSessions();
    return data as SessionDetail;
  };

  // 获取单个会话详情
  const getSession = async (id: string): Promise<SessionDetail | null> => {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return null;
    return res.json();
  };

  // 删除会话
  const deleteSession = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    await fetchSessions();
  };

  return { sessions, loading, createSession, getSession, deleteSession, fetchSessions };
}
