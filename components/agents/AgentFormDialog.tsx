"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Agent } from "@/hooks/useAgents";

// 服务商下拉选项
const PROVIDER_OPTIONS = [
  { value: "DEEPSEEK", label: "DeepSeek" },
  { value: "GLM", label: "GLM" },
  { value: "KIMI", label: "Kimi" },
  { value: "QWEN", label: "Qwen" },
  { value: "DOUBAO", label: "豆包" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    displayName: string;
    provider: string;
    modelName: string;
    systemPrompt: string;
  }) => void;
  agent?: Agent | null;  // 传入时是编辑模式，否则是新建模式
}

/**
 * AgentFormDialog — Agent 新建/编辑弹窗
 * 包含显示名称、服务商、模型名、系统提示词字段
 */
export function AgentFormDialog({ open, onClose, onSave, agent }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [provider, setProvider] = useState("DEEPSEEK");
  const [modelName, setModelName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  // 弹窗打开时，根据 agent 是否为 null 判断新增/编辑模式
  useEffect(() => {
    if (agent) {
      setDisplayName(agent.displayName);
      setProvider(agent.provider);
      setModelName(agent.modelName);
      setSystemPrompt(agent.systemPrompt);
    } else {
      setDisplayName("");
      setProvider("DEEPSEEK");
      setModelName("");
      setSystemPrompt("");
    }
  }, [agent, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ displayName, provider, modelName, systemPrompt });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={agent ? "编辑 Agent" : "添加 Agent"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 显示名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            显示名称
          </label>
          <input
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="例如：DeepSeek 思考者"
          />
        </div>

        {/* 服务商选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            服务商
          </label>
          <Select
            options={PROVIDER_OPTIONS}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
        </div>

        {/* 模型名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            模型名称
          </label>
          <input
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
            placeholder="例如：deepseek-v4-pro"
          />
        </div>

        {/* 系统提示词 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            系统提示词（角色设定）
          </label>
          <Textarea
            rows={3}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="你是一个乐于助人的AI助手..."
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" size="md">保存</Button>
        </div>
      </form>
    </Dialog>
  );
}
