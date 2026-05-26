import type { SessionSummary } from "@/hooks/useSessions";
import { Button } from "@/components/ui/Button";

interface Props {
  session: SessionSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * SessionCard — 历史会话列表中的单张卡片
 * 显示话题、状态指示灯、轮次、费用，点击可查看详情
 */
export function SessionCard({ session, isActive, onSelect, onDelete }: Props) {
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isActive
          ? "bg-blue-50 border-blue-300 shadow-sm"
          : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
      onClick={() => onSelect(session.id)}
    >
      {/* 话题名 */}
      <div className={`text-sm font-medium truncate mb-1 ${
        isActive ? "text-blue-700" : "text-gray-800"
      }`}>
        {session.topic || "未命名"}
      </div>

      {/* 状态指示 + 统计 + 删除 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            session.status === "ACTIVE" ? "bg-green-500 animate-status-pulse" :
            session.status === "ERROR" ? "bg-red-500" : "bg-gray-400"
          }`} />
          <span>R{session.roundCount}</span>
          <span>${session.totalCost.toFixed(4)}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();  // 防止触发展开详情
            if (window.confirm("确定删除这条会话记录吗？")) {
              onDelete(session.id);
            }
          }}
        >
          删除
        </Button>
      </div>
    </div>
  );
}
