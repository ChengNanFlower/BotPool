"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/hooks/useChatStream";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
}

/**
 * MessageList — 消息列表容器
 * 自动滚到底部（用户手动上滚时暂停自动滚动，显示"新消息"按钮）
 */
export function MessageList({ messages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // 新消息到来时自动滚到底部（除非用户手动上滚）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (!userScrolledUp || isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, userScrolledUp]);

  // 监听用户滚动，判断是否在底部
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setUserScrolledUp(!isAtBottom);
  };

  // 空状态
  if (messages.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-12 text-center text-gray-400 text-sm"
      >
        在上方输入话题，点击「开始」启动对话。
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4 flex flex-col gap-3"
      >
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id || i} message={msg} />
        ))}
      </div>

      {/* 回到底部按钮（用户上滚时显示） */}
      {userScrolledUp && (
        <button
          onClick={() => {
            const el = containerRef.current;
            if (el) {
              el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              setUserScrolledUp(false);
            }
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-gray-700"
        >
          ↓ 新消息
        </button>
      )}
    </div>
  );
}
