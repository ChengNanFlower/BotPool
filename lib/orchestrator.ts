import { prisma } from "./prisma";
import { MessageRole, type AgentProfile, type ChatSession } from "@prisma/client";
import { chatCompletionStream } from "./adapter";
import { buildContextWindow } from "./context-window";
import { calculateMessageCost } from "./cost-tracker";
import { activeAgentStreams, interjectResolves } from "./session-store";
import type { SSEEvent, UsageInfo } from "./types";

// ---------- 常量 ----------

const MAX_ROUNDS = 50;                // 单次会话最大论次
const MAX_PER_AGENT_FAILURES = 3;     // 单个 Agent 连续失败上限，超过则禁用

// ---------- 核心编排器：轮转调度 ----------

/**
 * 按 Agent 列表顺序轮转调度，每个 Agent 依次发言，一轮结束后暂停等待用户插话。
 * 这是一个 AsyncGenerator，通过 yield SSEEvent 实时推送事件给前端。
 *
 * @param session     当前会话
 * @param agents      本轮参与的 Agent 列表（按 sortOrder 排序）
 * @param sessionSignal 会话级 AbortSignal，stop 时触发
 */
export async function* runRoundRobin(
  session: ChatSession,
  agents: AgentProfile[],
  sessionSignal: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const agentFailCount = new Map<string, number>();   // 记录每个 Agent 的连续失败次数
  const disabledAgents = new Set<string>();            // 已被禁用的 Agent（超过失败上限）

  // 获取当前最大序列号，新消息从此 +1 开始
  const maxSeq = await prisma.chatMessage.aggregate({
    where: { sessionId: session.id },
    _max: { sequenceNum: true },
  });
  let seqNum = (maxSeq._max.sequenceNum ?? 1) + 1;

  // ---- 通知前端会话开始 ----
  yield {
    type: "session_start",
    data: {
      sessionId: session.id,
      topic: session.topic,
      agents: agents.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        provider: a.provider,
      })),
      totalAgents: agents.length,
    },
  };

  let roundNum = session.roundCount + 1;

  // ---- 主循环：逐轮对话 ----
  while (roundNum <= MAX_ROUNDS && !sessionSignal.aborted) {
    let roundSuccesses = 0;

    // ---- 一轮内逐个 Agent 发言 ----
    for (const agent of agents) {
      if (sessionSignal.aborted) break;
      if (disabledAgents.has(agent.id)) continue;

      // 为当前 Agent 创建独立的 AbortController（支持 skip）
      const agentController = new AbortController();
      activeAgentStreams.set(session.id, agentController);

      // 合并信号：session 被 stop 或 agent 被 skip 都会触发
      const combinedSignal = AbortSignal.any([sessionSignal, agentController.signal]);

      // 读取当前会话的全部历史消息（含发言人信息）
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { sequenceNum: "asc" },
        include: { agent: { select: { displayName: true } } },
      });

      // 过滤空内容，为每条 AI 消息加上 [发言人] 前缀以区分身份
      const historyMessages = messages
        .filter((m) => m.content && m.content.trim().length > 0)
        .map((m) => ({
          role: mapRole(m.role),
          content:
            m.role === "ASSISTANT" && m.agent
              ? `[${m.agent.displayName}]: ${m.content}`
              : m.content,
        }));

      // 构建上下文窗口（自动裁剪过长历史）
      const contextMessages = buildContextWindow(
        agent.provider,
        agent.systemPrompt,
        historyMessages,
      );

      // 通知前端：某个 Agent 开始思考
      yield {
        type: "agent_thinking",
        data: {
          agentId: agent.id,
          displayName: agent.displayName,
          provider: agent.provider,
          roundNum,
          sequenceNum: seqNum,
        },
      };

      try {
        let fullContent = "";
        let usage: UsageInfo | null = null;

        // 调用模型流式接口
        const stream = chatCompletionStream(
          agent.provider,
          agent.modelName,
          contextMessages,
          combinedSignal,
        );

        // ---- 逐 token 接收并推送给前端 ----
        for await (const chunk of stream) {
          if (combinedSignal.aborted) break;

          if ("token" in chunk) {
            fullContent += chunk.token;
            yield {
              type: "token",
              data: {
                agentId: agent.id,
                displayName: agent.displayName,
                provider: agent.provider,
                token: chunk.token,
                sequenceNum: seqNum,
              },
            };
          }

          if ("usage" in chunk && chunk.usage) {
            usage = chunk.usage;
          }
        }

        activeAgentStreams.delete(session.id);

        // 用户主动 stop — 保存部分内容然后退出
        if (sessionSignal.aborted) {
          await savePartialMessage(session.id, agent.id, fullContent, seqNum, roundNum);
          break;
        }

        // 用户 skip — 保存部分内容，标记跳过，继续下一个 Agent
        if (agentController.signal.aborted) {
          await savePartialMessage(session.id, agent.id, fullContent, seqNum, roundNum);
          seqNum++;
          yield {
            type: "agent_error",
            data: {
              agentId: agent.id,
              displayName: agent.displayName,
              error: "Skipped by user",
              roundNum,
              skipped: true,
            },
          };
          continue;
        }

        // ---- 正常完成：计算费用，持久化消息 ----
        const promptTokens = usage?.promptTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;
        const cost = calculateMessageCost(agent.provider, promptTokens, outputTokens);

        const message = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            agentId: agent.id,
            role: "ASSISTANT",
            content: fullContent,
            sequenceNum: seqNum,
            roundNum,
            promptTokens,
            outputTokens,
            cost,
          },
        });

        agentFailCount.set(agent.id, 0);  // 重置连续失败计数
        roundSuccesses++;
        seqNum++;

        yield {
          type: "message_complete",
          data: {
            agentId: agent.id,
            displayName: agent.displayName,
            provider: agent.provider,
            messageId: message.id,
            content: fullContent,
            sequenceNum: seqNum - 1,
            roundNum,
            usage: {
              promptTokens,
              outputTokens,
              cost,
            },
          },
        };
      } catch (error) {
        // ---- Agent 调用失败处理 ----
        activeAgentStreams.delete(session.id);

        if (sessionSignal.aborted) break;

        // skip 引起的错误不计数
        if (agentController.signal.aborted) {
          seqNum++;
          continue;
        }

        const failures = (agentFailCount.get(agent.id) || 0) + 1;
        agentFailCount.set(agent.id, failures);

        const errMsg = error instanceof Error ? error.message : "Unknown error";

        yield {
          type: "agent_error",
          data: {
            agentId: agent.id,
            displayName: agent.displayName,
            error: errMsg,
            roundNum,
            skipped: true,
          },
        };

        // 记录一条空的错误消息占位
        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            agentId: agent.id,
            role: "ASSISTANT",
            content: "",
            sequenceNum: seqNum,
            roundNum,
            isError: true,
            errorMessage: errMsg,
          },
        });
        seqNum++;

        // 连续失败达上限，禁用该 Agent
        if (failures >= MAX_PER_AGENT_FAILURES) {
          disabledAgents.add(agent.id);
          yield {
            type: "agent_disabled",
            data: {
              agentId: agent.id,
              displayName: agent.displayName,
              reason: `${MAX_PER_AGENT_FAILURES} consecutive failures`,
            },
          };
        }
      }
    }

    if (sessionSignal.aborted) break;

    // 全员失败的极端情况
    const activeAgents = agents.filter((a) => !disabledAgents.has(a.id));
    if (activeAgents.length > 0 && roundSuccesses === 0) {
      yield {
        type: "session_error",
        data: {
          sessionId: session.id,
          error: `All agents failed in round ${roundNum}`,
        },
      };
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { status: "ERROR", endedAt: new Date() },
      });
      break;
    }

    // ---- 一轮结束：更新会话统计 ----
    const totalCost = await prisma.chatMessage.aggregate({
      where: { sessionId: session.id },
      _sum: { cost: true },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        roundCount: roundNum,
        totalCost: totalCost._sum.cost ?? 0,
      },
    });

    yield {
      type: "round_complete",
      data: {
        roundNum,
        totalRounds: roundNum,
        sessionCost: totalCost._sum.cost ?? 0,
      },
    };

    // ---- 轮次间暂停：等待用户插话 ----
    if (!sessionSignal.aborted && roundNum < MAX_ROUNDS) {
      yield {
        type: "round_paused",
        data: { sessionId: session.id, roundNum },
      };

      // 等待用户在 UI 输入插话内容（interject API 调用 resolve 来解除阻塞）
      const interjected = await new Promise<string | null>((resolve) => {
        if (sessionSignal.aborted) { resolve(null); return; }
        interjectResolves.set(session.id, (msg) => {
          interjectResolves.delete(session.id);
          resolve(msg);
        });
        const checkAbort = () => {
          if (sessionSignal.aborted) {
            interjectResolves.delete(session.id);
            resolve(null);
          }
        };
        sessionSignal.addEventListener("abort", checkAbort, { once: true });
      });

      if (interjected === null || sessionSignal.aborted) break;

      // 将用户插话保存为 USER 消息
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content: interjected,
          sequenceNum: seqNum++,
          roundNum,
        },
      });

      yield {
        type: "user_interjected",
        data: { content: interjected, roundNum },
      };
    }

    roundNum++;
  }

  // ---- 会话结束 ----
  const stopReason = sessionSignal.aborted ? "user_requested" : "max_rounds_reached";

  await prisma.chatSession.update({
    where: { id: session.id },
    data: {
      status: "STOPPED",
      stopReason,
      endedAt: new Date(),
    },
  });

  yield {
    type: "session_stopped",
    data: {
      sessionId: session.id,
      stopReason,
      totalRounds: roundNum - 1,
    },
  };
}

// ---------- 辅助函数 ----------

/** 将数据库 MessageRole 枚举映射为 API 调用使用的 role 字符串 */
function mapRole(role: MessageRole): string {
  switch (role) {
    case "SYSTEM":
      return "system";
    case "USER":
      return "user";
    case "ASSISTANT":
      return "assistant";
    default:
      return "user";
  }
}

/** 保存被中断（stop/skip）的 Agent 部分输出 */
async function savePartialMessage(
  sessionId: string,
  agentId: string,
  content: string,
  seqNum: number,
  roundNum: number,
) {
  await prisma.chatMessage.create({
    data: {
      sessionId,
      agentId,
      role: "ASSISTANT",
      content,
      sequenceNum: seqNum,
      roundNum,
      isError: false,
    },
  });
}
