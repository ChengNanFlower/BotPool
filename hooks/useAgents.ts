"use client";

import { useState, useEffect, useCallback } from "react";

// ---- 从 API 返回的 Agent 数据结构 ----
export interface Agent {
  id: string;
  sortOrder: number;
  displayName: string;
  provider: string;
  modelName: string;
  systemPrompt: string;
  enabled: boolean;
}

/**
 * useAgents — Agent CRUD 操作 hook
 * 管理 Agent 列表的获取、创建、更新、删除、排序
 */
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // 从 API 拉取 Agent 列表
  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/agents");
    if (res.ok) {
      setAgents(await res.json());
    }
    setLoading(false);
  }, []);

  // 组件挂载时自动拉取
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // 创建新 Agent
  const createAgent = async (data: {
    displayName: string;
    provider: string;
    modelName: string;
    systemPrompt?: string;
  }) => {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const e = await res.json(); if (e?.error) msg = e.error; } catch {}
      throw new Error(msg);
    }
    await fetchAgents();
  };

  // 更新已有 Agent 的部分字段
  const updateAgent = async (
    id: string,
    data: Partial<{
      displayName: string;
      provider: string;
      modelName: string;
      systemPrompt: string;
      enabled: boolean;
    }>,
  ) => {
    const res = await fetch(`/api/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const e = await res.json(); if (e?.error) msg = e.error; } catch {}
      throw new Error(msg);
    }
    await fetchAgents();
  };

  // 删除 Agent
  const deleteAgent = async (id: string) => {
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    await fetchAgents();
  };

  // 拖拽排序后持久化
  const reorderAgents = async (orderedIds: string[]) => {
    const res = await fetch("/api/agents/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (res.ok) {
      setAgents(await res.json());
    }
  };

  return { agents, loading, createAgent, updateAgent, deleteAgent, reorderAgents };
}
