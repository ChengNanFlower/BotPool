import type { Agent } from "@/hooks/useAgents";
import { Button } from "@/components/ui/Button";

interface Props {
  agent: Agent;
  onEdit: () => void;
  onDelete: () => void;
}

// 服务商名称映射
const PROVIDER_LABELS: Record<string, string> = {
  DEEPSEEK: "DeepSeek",
  GLM: "GLM",
  KIMI: "Kimi",
  QWEN: "Qwen",
  DOUBAO: "豆包",
};

/** AgentCard — Agent 列表中的单张卡片，显示名称、服务商标签和操作按钮 */
export function AgentCard({ agent, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 truncate">
            {agent.displayName}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            {PROVIDER_LABELS[agent.provider] || agent.provider}
          </span>
        </div>
        <div className="text-xs text-gray-400 truncate">
          {agent.modelName}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          编辑
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          删除
        </Button>
      </div>
    </div>
  );
}
