"use client";

import { useCallback } from "react";

/**
 * useScreenshot — 聊天区截图 hook
 * 使用 html2canvas 库将 DOM 元素渲染为 PNG 并触发下载
 */
export function useScreenshot() {
  const capture = useCallback(async (element: HTMLElement) => {
    // 动态导入，减少首屏加载体积
    const { default: html2canvas } = await import("html2canvas");

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,                           // 2x 清晰度
      useCORS: true,                       // 支持跨域图标
      logging: false,
      height: element.scrollHeight,        // 截取完整高度
      windowHeight: element.scrollHeight,
    });

    // Canvas → Blob → 下载
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatroom-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);  // 释放内存
  }, []);

  return { capture };
}
