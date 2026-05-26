import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BotPool — AI 聊天室",
  description: "AI 聊天室 — DeepSeek、GLM、Kimi、Qwen 四家模型多角色对话",
};

/** 根布局：设置 HTML lang 和全高 body，所有页面共享 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}
