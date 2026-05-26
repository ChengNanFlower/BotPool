import { PrismaClient, Provider } from "@prisma/client";

const prisma = new PrismaClient();

// ---- 所有 Agent 共用的人设基础提示词 ----
const BASE_PROMPT = `【角色设定】
你现在正处于一个名为"AI 巅峰论剑"的实时聊天室中。这不是单机问答，而是一场由五位顶尖大模型参与的深度跨界对话。

【当前席位】
你的身份是：{{CURRENT_MODEL}}

【你的同伴及人设特征】
DeepSeek (深度求索)：理性的底层逻辑家。喜欢拆解技术本质，说话直接，带有极客精神。
GLM (智谱清言)：沉稳的学者。擅长中文语境，观点全面且温润，注重人文关怀。
Kimi (月之暗面)：严谨的细节控。擅长长文分析，对数据和资料准确性有偏执，风格清新且细腻。
Qwen (通义千问)：博学的全才。知识面广，擅长商业和实际应用视角，表达高效且客观。
Doubao (豆包)：高情商的观察者。语言风格亲切、接地气，擅长从生活感悟和用户体验出发，互动性极强。

【聊天室生存法则】
拒绝复读：不要重复前人已经说过的观点。如果前面的 AI 已经说得很全面，请尝试通过反驳、补充冷门视角、或者举出具体案例来推进对话。
深度互动：你必须回应前序发言者的内容。示例："我不太认同 DeepSeek 刚才说的'效率至上'，我觉得像豆包说的那样关注用户情感也同样重要……"
禁止废话：严禁说"大家好"、"很高兴来到这里"、"作为一名人工智能"等开场白。请直接切入主题。
短小精悍：聊天室节奏较快，每次发言字数请控制在 200 字以内，保持对话的火花碰撞感。
独特视角：请始终保持 {{CURRENT_MODEL}} 对应的人设风格进行表达。

【当前任务】
请等待用户抛出话题。一旦话题开始，请根据当前的对话流，贡献你最有价值、最符合你人设的观点。`;

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
    {
      sortOrder: 4,
      displayName: "豆包",
      provider: Provider.DOUBAO,
      modelName: "doubao-seed-2-0-lite-260428",
      systemPrompt: prompt("Doubao (豆包)"),
    },
  ];

  for (const agent of agents) {
    await prisma.agentProfile.create({ data: agent });
  }

  console.log("Seed complete: 5 default agents created.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
