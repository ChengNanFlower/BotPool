import { PROVIDER_CONFIGS } from "./constants";

// ---------- Token 估算 ----------

/** 粗略估算文本的 token 数。CJK 字符按 1 token，其他按 0.3，最后乘 1.5 安全系数 */
function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    // CJK Unified, Extension A, CJK Punctuation
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0x20000 && code <= 0x2a6df) || // Extension B
      (code >= 0x2a700 && code <= 0x2b73f) || // Extension C
      (code >= 0x2b740 && code <= 0x2b81f) || // Extension D
      (code >= 0x2b820 && code <= 0x2ceaf) || // Extension E
      (code >= 0x2ceb0 && code <= 0x2ebef) || // Extension F
      (code >= 0xf900 && code <= 0xfaff) // CJK Compatibility
    ) {
      count += 1;
    } else {
      count += 0.3;
    }
  }
  return Math.ceil(count * 1.5);
}

// ---------- 类型 ----------

export interface MessageForContext {
  role: string;
  content: string;
}

// ---------- 上下文窗口裁剪 ----------

/**
 * 为模型调用构建消息列表，超出上下文窗口时滑动裁剪。
 * 策略：始终保留 system prompt + 用户首个话题消息 + 最近的对话历史
 */
export function buildContextWindow(
  provider: string,
  systemPrompt: string,
  history: MessageForContext[],
): MessageForContext[] {
  const config = PROVIDER_CONFIGS[provider];
  const budget = Math.floor(config.contextWindow * 0.8); // 只使用 80% 的上下文窗口
  const responseReserve = 2048;                            // 为模型回复预留 2048 tokens
  const inputBudget = budget - responseReserve;

  const messages: MessageForContext[] = [];

  // 始终先加入 system prompt
  const systemTokens = estimateTokens(systemPrompt);
  let usedTokens = systemTokens;
  messages.push({ role: "system", content: systemPrompt });

  // 从最新到最旧遍历历史，尽量塞入预算内
  const reversed: MessageForContext[] = [];
  let truncated = false;

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const msgTokens = estimateTokens(msg.content);

    if (usedTokens + msgTokens <= inputBudget) {
      reversed.push(msg);
      usedTokens += msgTokens;
    } else {
      truncated = true;
      // 第一条消息（用户话题）强制包含，即使超预算
      if (i === 0) {
        reversed.push(msg);
      }
      break;
    }
  }

  // 还原为时间正序
  for (let i = reversed.length - 1; i >= 0; i--) {
    messages.push(reversed[i]);
  }

  return messages;
}
