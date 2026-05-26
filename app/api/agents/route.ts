import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Provider } from "@prisma/client";

// 合法的 provider 值列表（由数据库枚举生成）
const ALLOWED_PROVIDERS = Object.values(Provider);
const MAX_AGENTS = 4;

/**
 * GET /api/agents — 获取所有 Agent 列表（按 sortOrder 升序）
 */
export async function GET() {
  const agents = await prisma.agentProfile.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(agents);
}

/**
 * POST /api/agents — 创建新 Agent
 * 校验必填字段、provider 合法性、数量上限
 */
export async function POST(request: NextRequest) {
  try {
    // 安全解析 JSON
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "请求体格式错误" },
        { status: 400 }
      );
    }

    // 数量上限检查
    const count = await prisma.agentProfile.count();
    if (count >= MAX_AGENTS) {
      return NextResponse.json(
        { error: `最多只能添加 ${MAX_AGENTS} 个角色` },
        { status: 400 }
      );
    }

    const { displayName, provider, modelName, systemPrompt } = body;

    // 必填字段校验
    if (!displayName || !provider || !modelName) {
      return NextResponse.json(
        { error: "displayName、provider、modelName 为必填项" },
        { status: 400 }
      );
    }

    // provider 合法性校验
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `provider 必须是以下之一: ${ALLOWED_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // 自动分配 sortOrder（当前最大值 + 1）
    const maxSort = await prisma.agentProfile.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const agent = await prisma.agentProfile.create({
      data: {
        displayName,
        provider,
        modelName,
        systemPrompt: systemPrompt || "",
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    console.error("[POST /api/agents]", message);
    return NextResponse.json(
      { error: `创建失败：${message}` },
      { status: 500 }
    );
  }
}
