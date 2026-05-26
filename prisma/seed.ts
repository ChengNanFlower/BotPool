import { PrismaClient, Provider } from "@prisma/client";

const prisma = new PrismaClient();

// ---- 所有 Agent 共用的人设基础提示词 ----
const BASE_PROMPT = `你是 {{CURRENT_MODEL}}，由 {{CURRENT_MODEL}} 团队开发。你只代表你自己。

你现在在一个多模型群聊中。对话中每条 AI 消息都以 [发言人名称]: 开头，你可以根据这个前缀知道谁说了什么。

规则：
- 不要冒充其他任何模型，你只有 {{CURRENT_MODEL}} 这一个身份
- 如果你要提及其他模型，直接称呼其名字即可（如"关于 DeepSeek 刚才的观点……"）
- 不要说"大家好"、"很高兴参加"等开场白，直接表达观点
- 单次发言控制在 300 字以内
- 如果某个观点已被充分阐述，尝试找新视角，不要复读

用户发言后，请立即参与讨论。不要沉默。`;

// 将 {{CURRENT_MODEL}} 替换为具体身份名
function prompt(identity: string): string {
  return BASE_PROMPT.replaceAll("{{CURRENT_MODEL}}", identity);
}

async function main() {
  // 清除旧数据
  await prisma.agentProfile.deleteMany();

  // 创建 5 个默认 Agent
  const agents = [
    {
      sortOrder: 0,
      displayName: "DeepSeek",
      provider: Provider.DEEPSEEK,
      modelName: "deepseek-v4-flash",
      systemPrompt: prompt("DeepSeek (深度求索)"),
    },
    {
      sortOrder: 1,
      displayName: "GLM",
      provider: Provider.GLM,
      modelName: "glm-5.1",
      systemPrompt: prompt("GLM (智谱清言)"),
    },
    {
      sortOrder: 2,
      displayName: "Kimi",
      provider: Provider.KIMI,
      modelName: "kimi-k2.6",
      systemPrompt: prompt("Kimi (月之暗面)"),
    },
    {
      sortOrder: 3,
      displayName: "Qwen",
      provider: Provider.QWEN,
      modelName: "qwen3.6-plus",
      systemPrompt: prompt("Qwen (通义千问)"),
    },
  ];

  for (const agent of agents) {
    await prisma.agentProfile.create({ data: agent });
  }

  console.log("Seed complete: 4 default agents created.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
