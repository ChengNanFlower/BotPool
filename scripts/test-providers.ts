import "dotenv/config";

const PROVIDERS = {
  deepseek: {
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    model: "deepseek-v4-flash",
  },
  glm: {
    name: "GLM (Zhipu)",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "GLM_API_KEY",
    model: "glm-5.1",
  },
  kimi: {
    name: "Kimi (Moonshot)",
    baseURL: "https://api.moonshot.cn/v1",
    apiKeyEnv: "KIMI_API_KEY",
    model: "kimi-k2.6",
  },
  qwen: {
    name: "Qwen (Tongyi)",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "QWEN_API_KEY",
    model: "qwen3.6-plus",
  },
} as const;

type TestResult = {
  provider: string;
  status: "ok" | "skip" | "fail";
  streaming: boolean;
  usageInStream: boolean;
  tokensReceived: number;
  error?: string;
};

async function testProvider(
  config: (typeof PROVIDERS)[keyof typeof PROVIDERS],
): Promise<TestResult> {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey || apiKey === "" || apiKey.startsWith("sk-your-") || apiKey === "your-glm-key") {
    return {
      provider: config.name,
      status: "skip",
      streaming: false,
      usageInStream: false,
      tokensReceived: 0,
      error: `API key not set (${config.apiKeyEnv})`,
    };
  }

  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Say hello in exactly one short sentence." }],
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown");
      return {
        provider: config.name,
        status: "fail",
        streaming: false,
        usageInStream: false,
        tokensReceived: 0,
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    if (!response.body) {
      return {
        provider: config.name,
        status: "fail",
        streaming: false,
        usageInStream: false,
        tokensReceived: 0,
        error: "Response body is null",
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let tokensReceived = 0;
    let usageInStream = false;
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.content) {
            content += delta.content;
            tokensReceived++;
          }

          if (parsed.usage) {
            usageInStream = true;
          }
        } catch {
          // skip unparseable lines
        }
      }
    }

    return {
      provider: config.name,
      status: "ok",
      streaming: tokensReceived > 0,
      usageInStream,
      tokensReceived,
      error: content ? undefined : "No content received",
    };
  } catch (err) {
    return {
      provider: config.name,
      status: "fail",
      streaming: false,
      usageInStream: false,
      tokensReceived: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log("Provider SSE Smoke Tests");
  console.log("========================");
  console.log();

  const results: TestResult[] = [];

  for (const config of Object.values(PROVIDERS)) {
    process.stdout.write(`Testing ${config.name} (${config.model})... `);
    const result = await testProvider(config);
    results.push(result);

    if (result.status === "ok") {
      console.log(`✓ OK (${result.tokensReceived} chunks, usage: ${result.usageInStream})`);
    } else if (result.status === "skip") {
      console.log(`⊘ SKIPPED (${result.error})`);
    } else {
      console.log(`✗ FAILED: ${result.error}`);
    }
  }

  console.log();
  console.log("Summary");
  console.log("-------");
  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const failed = results.filter((r) => r.status === "fail").length;
  console.log(`  Passed: ${ok}, Skipped: ${skipped}, Failed: ${failed}`);

  const usageOk = results.filter((r) => r.usageInStream).length;
  console.log(`  Usage in stream: ${usageOk}/${ok}`);

  if (failed > 0) {
    console.log();
    console.log("Failures:");
    for (const r of results.filter((r) => r.status === "fail")) {
      console.log(`  - ${r.provider}: ${r.error}`);
    }
  }

  if (skipped > 0) {
    console.log();
    console.log("Skipped (set API keys in .env to test):");
    for (const r of results.filter((r) => r.status === "skip")) {
      console.log(`  - ${r.provider}`);
    }
  }
}

main().catch(console.error);
