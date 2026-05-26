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

// ---------- 豆包思考标签过滤 ----------

// 豆包流式输出会包含 <think>...</think> 标签（内部推理过程），需要对用户隐藏。
// 标签带随机后缀如 <think_abc123>，用正则匹配。
const THINK_TAG = /<\/?think[\w-]*>/g;
const SAFE_TAIL = 50; // 保留末尾字符防止标签跨 SSE chunk 被截断

// ---------- 流式对话 API 调用 ----------

/**
 * 对指定 provider 发起流式 chat completion 请求，yield token 和 usage。
 * 内部处理了豆包的特殊 content 格式和 thinking 标签过滤。
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

  // 豆包要求 content 为数组格式：[{type:"text", text:"..."}]
  const bodyMessages =
    provider === "DOUBAO"
      ? messages.map((m) => ({
          role: m.role,
          content: [{ type: "text", text: m.content }],
        }))
      : messages;

  // 发起流式 HTTP 请求
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: bodyMessages,
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

  // 豆包专用：思考块过滤状态机
  let thinkBuf = "";
  let thinkDepth = 0;

  /**
   * 处理 content 中的 <think> 标签，在 thinkDepth=0 时输出安全内容
   * 使用生成器逐步产出 token，应对标签跨 chunk 的场景
   */
  function* processContent(raw: string): Generator<{ token: string }> {
    thinkBuf += raw;
    THINK_TAG.lastIndex = 0;

    while (thinkBuf.length > 0) {
      THINK_TAG.lastIndex = 0;
      const m = THINK_TAG.exec(thinkBuf);

      if (!m) {
        // 没匹配到完整标签 — 若不在思考块内，输出安全部分
        if (thinkDepth === 0) {
          const safe = thinkBuf.slice(0, -SAFE_TAIL);
          if (safe.length > 0) yield { token: safe };
        }
        thinkBuf = thinkBuf.slice(-SAFE_TAIL);
        break;
      }

      const fullTag = m[0];
      const isOpen = fullTag.startsWith("<think") && !fullTag.startsWith("</think");
      const tagStart = m.index;

      if (isOpen) {
        // 开标签：标签前的内容输出；进入思考块
        if (thinkDepth === 0 && tagStart > 0) {
          yield { token: thinkBuf.slice(0, tagStart) };
        }
        thinkBuf = thinkBuf.slice(tagStart + fullTag.length);
        thinkDepth++;
      } else {
        // 闭标签 </think...>：离开思考块
        thinkBuf = thinkBuf.slice(tagStart + fullTag.length);
        if (thinkDepth > 0) thinkDepth--;
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 累积缓冲区，按行切分 SSE 数据
      sseBuf += decoder.decode(value, { stream: true });
      const lines = sseBuf.split("\n");
      sseBuf = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          // 流结束，清空思考缓冲区残留
          if (thinkBuf && thinkDepth === 0 && thinkBuf.length > 0) {
            yield { token: thinkBuf };
          }
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          // 增量 token
          if (delta?.content) {
            if (provider === "DOUBAO") {
              for (const t of processContent(delta.content)) {
                yield t;
              }
            } else {
              yield { token: delta.content };
            }
          }

          // usage 信息通常在最后一条 SSE 消息中
          if (parsed.usage) {
            if (thinkBuf && thinkDepth === 0 && thinkBuf.length > 0) {
              yield { token: thinkBuf };
              thinkBuf = "";
            }
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
