import type { SessionSummary, SessionDetail } from "@/hooks/useSessions";
import { SessionCard } from "./SessionCard";

interface Props {
  sessions: SessionSummary[];
  loading: boolean;
  activeSessionId?: string | null;
  onSelect: (id: string) => Promise<SessionDetail | null>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * SessionHistory — 右侧历史会话面板
 * 展示会话摘要列表，支持点击查看详情或删除
 */
export function SessionHistory({ sessions, loading, activeSessionId, onSelect, onDelete }: Props) {
  return (
    <div className="w-60 border-l border-gray-200 bg-gray-50 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">历史会话</h2>
      </div>
      <div className="flex-1 min-h-0 overflow-y-scroll p-3 space-y-2">
        {loading && (
          <p className="text-sm text-gray-400 text-center py-8">加载中...</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">暂无会话。</p>
        )}
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
