import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Provider } from "@prisma/client";

// 从 Prisma 枚举生成合法的 provider 列表，用于校验请求参数
const ALLOWED_PROVIDERS = Object.values(Provider);

/**
 * GET /api/agents/[id] — 查询单个 Agent
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 按主键查找 Agent
    const agent = await prisma.agentProfile.findUnique({ where: { id } });

    if (!agent) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `查询失败：${message}` }, { status: 500 });
  }
}

/**
 * PUT /api/agents/[id] — 更新 Agent 的配置信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 安全解析 JSON 请求体，避免恶意格式导致崩溃
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
    }

    // 确保目标 Agent 存在，不存在则返回 404
    const existing = await prisma.agentProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const { displayName, provider, modelName, systemPrompt, enabled } = body;

    // 校验 provider 是否在合法枚举值范围内
    if (provider && !ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `provider 必须是以下之一: ${ALLOWED_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // 只更新客户端实际传了的字段（undefined 字段不覆盖原值）
    const agent = await prisma.agentProfile.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(provider !== undefined && { provider }),
        ...(modelName !== undefined && { modelName }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `更新失败：${message}` }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/[id] — 删除一个 Agent
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 先查后删：确保 Agent 存在，不存在则返回 404
    const existing = await prisma.agentProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    await prisma.agentProfile.delete({ where: { id } });

    // 204 No Content — 删除成功但无需返回响应体
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `删除失败：${message}` }, { status: 500 });
  }
}
