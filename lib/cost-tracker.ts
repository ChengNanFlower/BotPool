import { PROVIDER_CONFIGS } from "./constants";

/** 根据 token 用量计算一次 API 调用的费用（美元） */
export function calculateMessageCost(
  provider: string,
  promptTokens: number,
  outputTokens: number
): number {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) return 0;

  // pricing 单位是 USD/百万tokens，先换算为单 token 价格
  const inputPricePerToken = config.pricing.input / 1_000_000;
  const outputPricePerToken = config.pricing.output / 1_000_000;

  const cost =
    promptTokens * inputPricePerToken + outputTokens * outputPricePerToken;

  return Math.round(cost * 1_000_000) / 1_000_000; // 保留 6 位小数
}
