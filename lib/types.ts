// 项目中所有共享的 TypeScript 类型定义

/** 单个 AI 服务商的配置信息 */
export interface ProviderConfig {
  id: string;
  displayName: string;
  baseURL: string;
  apiKeyEnv: string;            // 环境变量名，如 "DEEPSEEK_API_KEY"
  defaultModel: string;
  models: { value: string; label: string }[];  // 可选模型列表
  contextWindow: number;         // 模型上下文窗口大小（tokens）
  pricing: { input: number; output: number }; // USD/百万tokens
  extraBody?: Record<string, unknown>;  // 请求时额外携带的 body 参数
}

/** 一次 API 调用的 token 用量 */
export interface UsageInfo {
  promptTokens: number;
  outputTokens: number;
}

/** SSE（Server-Sent Events）事件结构 */
export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}
