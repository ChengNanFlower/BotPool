"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/hooks/useChatStream";

interface Props {
  message: ChatMessage;
}

// 各服务商的标签配色方案
const PROVIDER_COLORS: Record<string, string> = {
  DEEPSEEK: "bg-blue-100 text-blue-800",
  GLM: "bg-purple-100 text-purple-800",
  KIMI: "bg-emerald-100 text-emerald-800",
  QWEN: "bg-orange-100 text-orange-800",
};

// 各服务商头像图标路径
const PROVIDER_ICONS: Record<string, string> = {
  DEEPSEEK: "/icons/deepseek.png",
  GLM: "/icons/glm.png",
  KIMI: "/icons/kimi.png",
  QWEN: "/icons/qwen.png",
};

/** Agent 头像组件（圆形图标，加载失败时隐藏） */
function AgentAvatar({ provider, displayName }: { provider?: string; displayName?: string }) {
  const iconPath = PROVIDER_ICONS[provider || ""];

  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0 overflow-hidden">
      {iconPath && (
        <img
          src={iconPath}
          alt={displayName || ""}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}

/** Markdown 渲染组件（支持 GFM 表格/任务列表等） */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-headings:my-1 prose-pre:my-1 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-100 prose-pre:p-3 prose-pre:rounded-lg prose-pre:text-xs">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * MessageBubble — 单条消息气泡
 * 用户消息：右对齐蓝色气泡
 * Agent 消息：左对齐白色气泡，带头像、名称标签、费用
 */
export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isError = message.isError;

  // 用户消息样式
  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-blue-600 text-white">
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>
      </div>
    );
  }

  // Agent 消息样式
  return (
    <div className="flex gap-3 justify-start">
      {/* 头像 */}
      <div className="shrink-0 mt-0.5">
        <AgentAvatar provider={message.provider} displayName={message.displayName} />
      </div>

      <div className="max-w-[75%]">
        {/* 名称标签 + 费用 */}
        {message.displayName && (
          <div className="flex items-center gap-2 mb-1 ml-1">
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded ${PROVIDER_COLORS[message.provider || ""] || "bg-gray-200 text-gray-700"}`}
            >
              {message.displayName}
            </span>
            {message.usage && (
              <span className="text-xs text-gray-400">
                ${message.usage.cost.toFixed(6)}
              </span>
            )}
          </div>
        )}

        {/* 消息内容 */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isError
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-white border border-gray-200 text-gray-900"
          } ${message.isStreaming ? "border-l-2 border-l-blue-500 animate-pulse" : ""}`}
        >
          {message.isStreaming ? (
            // 流式输出中：纯文本（拼接时避免 Markdown 解析闪烁）
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            // 已完成：Markdown 渲染
            <MarkdownContent
              content={message.content || (isError ? message.errorMessage || "错误" : "")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
