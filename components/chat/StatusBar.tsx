interface Props {
  roundNum: number;
  totalCost: number;
  currentAgentName: string | null;
  status: string;
}

/**
 * StatusBar — 对话区顶部状态栏
 * 根据状态显示：连接中 / 某 Agent 正在思考 / 等待插话 / 已结束等
 */
export function StatusBar({ roundNum, totalCost, currentAgentName, status }: Props) {
  // 空闲时不显示
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-b bg-white text-sm">
      {status === "connecting" && (
        <span className="text-gray-500">连接中...</span>
      )}
      {status === "streaming" && currentAgentName && (
        <span className="flex items-center gap-2 text-blue-600">
          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          {currentAgentName} 正在思考...
        </span>
      )}
      {status === "streaming" && !currentAgentName && (
        <span className="text-gray-400">等待中...</span>
      )}
      {status === "paused" && (
        <span className="text-yellow-600">等待你的发言...</span>
      )}
      {status === "stopped" && (
        <span className="text-gray-500">对话已结束</span>
      )}
      {status === "error" && (
        <span className="text-red-500">错误</span>
      )}

      {/* 轮次 & 费用 */}
      <span className="text-gray-200">|</span>
      <span className="text-gray-500">第 {roundNum} 轮</span>
      <span className="text-gray-400">${totalCost.toFixed(6)}</span>
    </div>
  );
}
