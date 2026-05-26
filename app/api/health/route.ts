import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — 健康检查
 * 返回服务状态、各 API Key 是否已配置、数据库连接是否就绪
 */
export async function GET() {
  const keys: Record<string, boolean> = {};

  for (const config of Object.values(PROVIDER_CONFIGS)) {
    const key = process.env[config.apiKeyEnv];
    keys[config.apiKeyEnv] = Boolean(key && key.length > 0);
  }

  return NextResponse.json({
    status: "ok",
    keys,
    database: Boolean(process.env.DATABASE_URL),
  });
}
