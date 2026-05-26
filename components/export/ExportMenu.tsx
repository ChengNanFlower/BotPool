"use client";

import { Button } from "@/components/ui/Button";

interface Props {
  sessionId: string | null;
  onScreenshot: () => void;
  disabled?: boolean;
}

/**
 * ExportMenu — 导出操作菜单
 * 提供「导出 MD」（下载 Markdown 文件）和「截长图」两个按钮
 */
export function ExportMenu({ sessionId, onScreenshot, disabled }: Props) {
  // 通过创建隐藏 <a> 标签触发 MD 文件下载
  const handleMDDownload = () => {
    if (!sessionId) return;
    const a = document.createElement("a");
    a.href = `/api/sessions/${sessionId}/export/md`;
    a.download = `chatroom-${sessionId.slice(0, 8)}.md`;
    a.click();
  };

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleMDDownload}
        disabled={!sessionId || disabled}
      >
        导出 MD
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={onScreenshot}
        disabled={disabled}
      >
        截长图
      </Button>
    </div>
  );
}
