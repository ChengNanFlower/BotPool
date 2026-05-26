import type { UsageInfo } from "./types";
import { PROVIDER_CONFIGS } from "./constants";

// ---------- 自定义错误类型 ----------

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public status: number,
    public body: string
  ) {
    super(`[${provider}] HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = "ProviderError";
  }
}

// ---------- 流式对话 API 调用 ----------

/**
 * 对指定 provider 发起流式 chat completion 请求（OpenAI 兼容格式），
 * yield token 和 usage。所有 provider 统一 OpenAI 兼容格式处理。
 */
export async function* chatCompletionStream(
  provider: string,
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): AsyncGenerator<{ token: string } | { usage: UsageInfo }> {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // 读取对应服务商的 API Key
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(
      `API key not configured. Set ${config.apiKeyEnv} in your .env file.`
    );
  }

  // 发起流式 HTTP 请求
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      ...(config.extraBody || {}),
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ProviderError(provider, response.status, errorText);
  }

  if (!response.body) {
    throw new Error(`[${provider}] Response body is null`);
  }

  // ---------- SSE 流解析 ----------

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let sseBuf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuf += decoder.decode(value, { stream: true });
      const lines = sseBuf.split("\n");
      sseBuf = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.content) {
            yield { token: delta.content };
          }

          if (parsed.usage) {
            yield {
              usage: {
                promptTokens: parsed.usage.prompt_tokens ?? 0,
                outputTokens: parsed.usage.completion_tokens ?? 0,
              },
            };
          }
        } catch {
          // skip unparseable SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
