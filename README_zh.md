<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="NanoDex" width="400">
</p>

<h1 align="center">NanoDex</h1>

<p align="center">
  一个可自托管的 Codex 助手，具备 Docker 隔离、按群组划分的记忆，以及一个足够小、足够清晰、可以安全改造的代码库。
</p>

## 概览

NanoDex 是一个可自托管的 Codex 助手运行时。它的目标不是把项目重做成另一个平台，而是保持系统足够小、足够清晰，并且便于你在自己的 Fork 中直接改造。

每个群组都有自己的工作区、会话状态、指令文件和工具。共享行为放在 `AGENTS.md` 与 `.agents/skills` 中，宿主编排器保持尽量精简，只负责路由、持久化、调度和容器生命周期。

项目的权威设计原则请看 [PHILOSOPHY.md](PHILOSOPHY.md) 和 [PHILOSOPHY_zh.md](PHILOSOPHY_zh.md)。

## 为什么是 NanoDex

- 足够小，便于理解和修改
- 通过 Docker 为每个群组提供真实隔离
- 面向个人 Fork，而不是通用平台
- 默认以 WhatsApp 为首选路径
- Telegram、Slack、Discord 作为可选的内置通道
- 通过 `AGENTS.md` 管理共享与分组记忆
- 通过 Codex 在仓库内直接完成安装、调试和定制

## 快速开始

```bash
git clone https://github.com/<your-username>/nanodex.git
cd nanodex
npm start
```

首次启动时，NanoDex 会准备本地环境，然后把设置工作交给你终端里的 Codex。如果设置过程改动了仓库或运行时状态，NanoDex 会自动重建并重启。

## 设计原则

**足够小。** NanoDex 应该始终保持在一个人可以从头到尾理解的规模内。

**真实隔离。** 智能体只应看到被明确挂载的内容。安全性应该来自容器边界，而不是应用层的权限戏法。

**为个人 Fork 而生。** NanoDex 不是通用框架。它应该是一个你可以 Fork、阅读、修改，并逐步变成自己专属助手的代码库。

**代码优先于配置。** 与其不断增加配置项，不如保持代码直接、清晰、容易推理。

**Agent 是界面。** 安装、调试、定制都应该通过 Codex 在仓库中完成，而不是依赖图形面板或 shell 向导。

**产品一致性。** NanoDex 应该在安装、调试和日常使用中保持小而直接的自托管形态。

**WhatsApp 优先。** 默认路径是一个可通过 WhatsApp 使用的个人助手。其他通道存在，但它们是次级选项，而不是同等地位的产品核心。

## 运行要求

- Node.js 20 或更高版本
- 本地 Docker 正在运行
- 已登录本机 Codex，或提供 `OPENAI_API_KEY` / `CODEX_API_KEY`

## 默认通道

NanoDex 的默认路径是 WhatsApp。

如果你希望走标准安装路径，建议先从 WhatsApp 开始设置。

## 可选内置通道

NanoDex 目前还内置支持：

- Telegram
- Slack
- Discord

首次运行时，如果你没有明确要求别的通道，Codex 应该优先推荐 WhatsApp；如果你明确说要 Telegram 或其他通道，它也应该能直接按你的选择完成设置。

## 认证

NanoDex 优先复用你本机现有的 Codex 登录状态。

支持的来源包括：

- `~/.codex/auth.json`
- 主机钥匙串中的 Codex 凭据
- NanoDex 为各群组缓存的会话认证信息

如果本机登录态不可用，NanoDex 会回退到 API Key 模式。

`.env` 示例：

```bash
OPENAI_API_KEY=your_key_here
# 或
CODEX_API_KEY=your_key_here

# 可选
OPENAI_BASE_URL=https://your-endpoint.example.com
CODEX_MODEL=gpt-5.3-codex
```

如果你使用的是本机 Codex 登录，通常不需要手动修改太多 `.env` 内容。

## 常用命令

启动 NanoDex：

```bash
npm start
```

仅准备环境但不启动长期运行进程：

PowerShell：

```powershell
$env:NANODEX_PREPARE_ONLY='1'
npm start
```

macOS / Linux：

```bash
NANODEX_PREPARE_ONLY=1 npm start
```

开发模式：

```bash
npm run dev
```

常用检查：

```bash
npm run typecheck
npm run build
npm run test -- src/codex-runtime-env.test.ts src/container-runner.test.ts
```

## 工作方式

NanoDex 运行链路如下：

```text
Channels -> SQLite -> Host orchestrator -> Docker container -> Codex thread -> Response
```

每个已注册群组都会得到：

- 独立可写工作区
- 独立 `.codex` 会话状态
- 独立 IPC 命名空间
- 独立的 `groups/<group>/AGENTS.md`

共享指令和可复用工作流位于：

- `groups/global/AGENTS.md`
- `.agents/skills/`

## Codex 体验

NanoDex 使用的是 Codex 的原生概念，而不是在上面重新模拟一套旧的 Claude 交互。真正的界面仍然是代理本身：你应该让 Codex 去检查仓库、配置通道、调试问题、修改你的 Fork。

可直接使用的内置 Codex 命令：

- `/compact`
- `/review`
- `/clear`
- `/plan`
- `/agent`
- `/skills`

本仓库包含的 Repo Skills：

- `$setup`
- `$customize`
- `$debug`
- `$update-nanodex`
- `$update-skills`

## 多智能体工作流

NanoDex 会在可用时启用 Codex 协作能力，包括：

- `spawn_agent`
- `send_input`
- `wait`
- `resume_agent`
- `close_agent`

这是 NanoDex 当前的实用型 Codex 多智能体路径，但它并不是 Claude 旧 Teams 能力的完全等价移植。

## 项目结构

- `src/index.ts`：宿主编排器
- `src/container-runner.ts`：Docker 挂载、认证注入与容器生命周期
- `container/agent-runner/src/index.ts`：容器侧 Codex 线程循环
- `container/agent-runner/src/ipc-mcp-stdio.ts`：内置 MCP 工具
- `src/db.ts`：SQLite 持久化
- `groups/*/AGENTS.md`：分组记忆与行为指令
- `.agents/skills/*`：仓库内可复用技能

## 开发

```bash
npm run dev
npm run build
npm run typecheck
```

容器检查：

```bash
cd container
docker build -t nanodex-agent:latest .
docker run -i --rm --entrypoint /bin/echo nanodex-agent:latest "Container OK"
```

## 说明

- NanoDex 是本仓库中统一使用的产品与运行时名称。
- 为兼容已有安装，宿主配置路径仍使用 `~/.config/nanoclaw`。
- 一些 Fork 中可能仍保留 `CLAUDE.md` 或 `.claude` 内容，但 NanoDex 以 `AGENTS.md` 和 `.agents` 为优先。
