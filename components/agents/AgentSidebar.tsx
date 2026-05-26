"use client";

import { useState } from "react";
import type { Agent } from "@/hooks/useAgents";
import { Button } from "@/components/ui/Button";
import { AgentCard } from "./AgentCard";
import { AgentFormDialog } from "./AgentFormDialog";

interface Props {
  agents: Agent[];
  loading: boolean;
  onCreate: (data: {
    displayName: string;
    provider: string;
    modelName: string;
    systemPrompt?: string;
  }) => Promise<void>;
  onUpdate: (
    id: string,
    data: Partial<{
      displayName: string;
      provider: string;
      modelName: string;
      systemPrompt: string;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * AgentSidebar — 左侧 Agent 管理面板
 * 展示 Agent 列表、添加/编辑弹窗、上限提示（最多 4 个）
 */
export function AgentSidebar({ agents, loading, onCreate, onUpdate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const maxReached = agents.length >= 4;

  // 保存时根据是否有 editingAgent 判断是新增还是更新
  const handleSave = async (data: {
    displayName: string;
    provider: string;
    modelName: string;
    systemPrompt: string;
  }) => {
    if (editingAgent) {
      await onUpdate(editingAgent.id, data);
    } else {
      await onCreate(data);
    }
    setEditingAgent(null);
  };

  return (
    <div className="w-72 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* 顶部标题 + 添加按钮 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          AI 角色 ({agents.length}/4)
        </h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingAgent(null);
            setDialogOpen(true);
          }}
          disabled={maxReached}
        >
          + 添加
        </Button>
      </div>

      {/* Agent 列表 */}
      <div className="flex-1 min-h-0 overflow-y-scroll p-4 space-y-3">
        {loading && (
          <p className="text-sm text-gray-400 text-center py-8">加载中...</p>
        )}
        {!loading && agents.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            暂无角色，点击「添加」创建。
          </p>
        )}
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onEdit={() => {
              setEditingAgent(agent);
              setDialogOpen(true);
            }}
            onDelete={() => onDelete(agent.id)}
          />
        ))}
      </div>

      {/* 新增/编辑弹窗 */}
      <AgentFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingAgent(null);
        }}
        onSave={handleSave}
        agent={editingAgent}
      />
    </div>
  );
}
