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
    models: [
      { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash (快速)" },
      { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro (旗舰)" },
    ],
    contextWindow: 1_000_000,
    pricing: { input: 0.14, output: 0.55 },
  },
  GLM: {
    id: "GLM",
    displayName: "GLM (Zhipu)",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "GLM_API_KEY",
    defaultModel: "glm-5.1",
    models: [
      { value: "glm-5.1", label: "GLM 5.1 (最新)" },
      { value: "glm-5.0", label: "GLM 5.0" },
      { value: "glm-4.7", label: "GLM 4.7" },
    ],
    contextWindow: 1_000_000,
    pricing: { input: 0.14, output: 0.14 },
    extraBody: { thinking: { type: "disabled" } },
  },
  KIMI: {
    id: "KIMI",
    displayName: "Kimi (Moonshot)",
    baseURL: "https://api.moonshot.cn/v1",
    apiKeyEnv: "KIMI_API_KEY",
    defaultModel: "kimi-k2.6",
    models: [
      { value: "kimi-k2.6", label: "Kimi K2.6 (最新)" },
      { value: "kimi-k2.5", label: "Kimi K2.5" },
    ],
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
    models: [
      { value: "qwen3.6-plus", label: "Qwen 3.6 Plus (均衡)" },
      { value: "qwen3.6-turbo", label: "Qwen 3.6 Turbo (极速)" },
    ],
    contextWindow: 131_072,
    pricing: { input: 0.11, output: 0.33 },
    extraBody: { enable_thinking: false },
  },
};
