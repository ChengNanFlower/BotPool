import { Button } from "@/components/ui/Button";

interface Props {
  status: string;
  onStart: () => void;
  onStop: () => void;
  onSkip: () => void;
  disabled: boolean;
}

/**
 * ChatControls — 底部操作按钮组
 * 空闲/结束态：显示「开始」/「新会话」
 * 活跃态：显示「停止」+「跳过当前」
 */
export function ChatControls({ status, onStart, onStop, onSkip, disabled }: Props) {
  const isActive = status === "streaming" || status === "connecting" || status === "paused";
  const isFinished = status === "stopped" || status === "error";

  return (
    <div className="flex gap-2">
      {!isActive && (
        <Button onClick={onStart} disabled={disabled} size="md">
          {isFinished ? "新会话" : "开始"}
        </Button>
      )}
      {isActive && (
        <>
          <Button onClick={onStop} variant="danger" size="md">
            停止
          </Button>
          <Button onClick={onSkip} variant="secondary" size="md">
            跳过当前
          </Button>
        </>
      )}
    </div>
  );
}
