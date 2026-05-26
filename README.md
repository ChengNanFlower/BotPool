# BotPool — AI 聊天室

让 DeepSeek、GLM、Kimi、Qwen 在同一话题下展开多轮对话，你随时插入发言引导讨论方向。

## 功能

- **多模型轮转对话**：Agent 按序发言，支持实时流式推送（SSE）
- **运行控制**：随时停止会话、跳过当前发言、在轮次间插入观点
- **Agent 管理**：添加/编辑/删除 AI 角色，拖拽排序，启用/禁用
- **上下文裁剪**：根据各模型上下文窗口自动滑动裁剪历史消息
- **费用追踪**：每次 API 调用自动计算并累计费用
- **会话回看**：历史会话列表，点击查看完整对话记录
- **导出**：支持导出 Markdown 文件、截取长图

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 前端 | React 19、Tailwind CSS 4、react-markdown |
| 数据库 | PostgreSQL + Prisma ORM |
| 实时通信 | Server-Sent Events (SSE) |
| 部署 | Docker / Docker Compose |

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入各服务商的 API Key
```

### 2. 初始化数据库

```bash
# 启动 PostgreSQL（如果没有本地实例）
docker compose up -d postgres

# 执行数据库迁移
npx prisma migrate dev --name init

# 写入种子数据（4 个默认 Agent）
npm run db:seed
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000，在左侧管理 Agent，输入话题即可开始。

### Docker 部署

```bash
docker compose up -d
```

## 项目结构

```
├── app/                  # Next.js App Router（页面 + API 路由）
│   ├── page.tsx          # 首页
│   ├── layout.tsx        # 根布局
│   └── api/              # REST API
│       ├── agents/       # Agent CRUD + 排序
│       ├── sessions/     # 会话 CRUD + 控制（start/stop/skip/interject）
│       └── health/       # 健康检查
├── components/           # React 组件
│   ├── agents/           # Agent 管理面板
│   ├── chat/             # 聊天界面（消息列表、输入框、状态栏）
│   ├── session/          # 历史会话面板
│   ├── export/           # 导出功能
│   └── ui/               # 通用 UI 组件
├── hooks/                # React Hooks（状态管理、SSE 连接、截图）
├── lib/                  # 核心业务逻辑
│   ├── orchestrator.ts   # 轮转编排引擎
│   ├── adapter.ts        # 多服务商 API 适配
│   ├── context-window.ts # 上下文窗口裁剪
│   ├── cost-tracker.ts   # 费用计算
│   └── constants.ts      # 服务商配置
├── prisma/               # 数据库 Schema + 种子数据
├── scripts/              # 服务商 API 测试脚本
└── public/icons/         # 模型头像图标
```

## 支持的模型

| 服务商 | 可选模型 |
|--------|---------|
| DeepSeek | V4 Flash、V4 Pro |
| GLM (智谱) | GLM 5.1、GLM 5.0、GLM 4.7 |
| Kimi (月之暗面) | K2.6、K2.5 |
| Qwen (通义千问) | 3.6 Plus、3.6 Turbo |

## 脚本

```bash
# 测试各服务商 API 连通性
npx tsx scripts/test-providers.ts
```
