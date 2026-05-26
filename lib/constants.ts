import type { ProviderConfig } from "./types";

/**
 * 所有支持的 AI 服务商配置
 * 每个服务商包含：API 地址、环境变量名、默认模型、上下文窗口、定价
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  DEEPSEEK: {
    id: "DEEPSEEK",
    displayName: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-v4-flash",
    contextWindow: 1_000_000,
    pricing: { input: 0.14, output: 0.55 },
  },
  GLM: {
    id: "GLM",
    displayName: "GLM (Zhipu)",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "GLM_API_KEY",
    defaultModel: "glm-5.1",
    contextWindow: 1_000_000,
    pricing: { input: 0.14, output: 0.14 },
    extraBody: { thinking: { type: "disabled" } },  // 关闭思维链以节省 token
  },
  KIMI: {
    id: "KIMI",
    displayName: "Kimi (Moonshot)",
    baseURL: "https://api.moonshot.cn/v1",
    apiKeyEnv: "KIMI_API_KEY",
    defaultModel: "kimi-k2.6",
    contextWindow: 262_144,
    pricing: { input: 0.60, output: 0.60 },
    extraBody: { thinking: { type: "disabled" } },
  },
  QWEN: {
    id: "QWEN",
    displayName: "Qwen (Tongyi)",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "QWEN_API_KEY",
    defaultModel: "qwen3.6-plus",
    contextWindow: 131_072,
    pricing: { input: 0.11, output: 0.33 },
    extraBody: { enable_thinking: false },
  },
  DOUBAO: {
    id: "DOUBAO",
    displayName: "Doubao (豆包)",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeyEnv: "DOUBAO_API_KEY",
    defaultModel: "doubao-seed-2-0-lite-260428",
    contextWindow: 128_000,
    pricing: { input: 0.11, output: 0.33 },
  },
};
