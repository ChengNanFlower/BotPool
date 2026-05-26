"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useScreenshot } from "@/hooks/useScreenshot";

interface Props {
  targetRef: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

/** ScreenshotButton — 长截图按钮（独立使用版本，当前在 ChatView 中直接使用了 ExportMenu） */
export function ScreenshotButton({ targetRef, disabled }: Props) {
  const { capture } = useScreenshot();

  const handleCapture = async () => {
    if (!targetRef.current) return;
    await capture(targetRef.current);
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleCapture} disabled={disabled}>
      截长图
    </Button>
  );
}
