import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions/[id]/export/md — 导出会话为 Markdown 文件
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 获取会话及其全部消息
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { sequenceNum: "asc" },
          include: { agent: { select: { displayName: true, provider: true } } },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    // ---- 构建 Markdown 内容 ----
    const lines: string[] = [
      `# ${session.topic || "AI 聊天室对话"}`,
      "",
      `- **日期:** ${session.createdAt.toISOString()}`,
      `- **状态:** ${session.status}`,
      `- **轮次:** ${session.roundCount}`,
      `- **费用:** $${(session.totalCost || 0).toFixed(6)}`,
      "",
      "---",
      "",
    ];

    for (const msg of session.messages) {
      if (msg.role === "USER") {
        lines.push(`### 用户`, "", msg.content, "");
      } else {
        const name = msg.agent
          ? `**${msg.agent.displayName}** (${msg.agent.provider})`
          : "未知发言者";
        const content = msg.isError
          ? `*[错误: ${msg.errorMessage || "无响应"}]*`
          : msg.content || "*[空回复]*";
        lines.push(`### ${name}`, "", content, "");
      }
    }

    const markdown = lines.join("\n");

    // 返回可下载的 .md 文件
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="chatroom-${id.slice(0, 8)}.md"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `导出失败：${message}` }, { status: 500 });
  }
}
