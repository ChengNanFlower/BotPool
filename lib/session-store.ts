// 运行时会话状态管理（非持久化，只在内存中）
// 这些 Map 用于跨 API 路由共享会话控制信号

/** 会话级 AbortController — stop 整个会话时触发 */
export const activeSessions = new Map<string, AbortController>();

/** Agent 级 AbortController — skip 当前发言的 Agent 时触发 */
export const activeAgentStreams = new Map<string, AbortController>();

/**
 * 轮次间暂停等待用户插话的 resolve 函数
 * orchestrator 在每轮结束后 await 一个 Promise；
 * interject API 调用 resolve 来唤醒 orchestrator 继续下一轮
 */
export const interjectResolves = new Map<string, (message: string) => void>();
