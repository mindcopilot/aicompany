# 部署文档 · LumenEdu AI Founder OS

本文档说明如何在服务器上部署本项目。项目为 npm workspaces 单仓双包：
`client`（Vite + React 前端）与 `server`（Express + TypeScript 后端）。

---

## 1. 架构与组件

| 组件 | 必需 | 说明 |
|------|------|------|
| **API 服务** (`server`) | ✅ | Express，默认监听 `8787`，提供 `/api/*` 与 `/health` |
| **前端静态资源** (`client`) | ✅ | `vite build` 产物，需由 Nginx 等静态服务器托管 |
| **PostgreSQL** | ✅ | 数据库；首次启动时自动建表并灌入种子数据 |
| **Temporal** | ⬜ 可选 | 工作流引擎，驱动方向扫描/论证等 Agent 流程；未运行时相关接口返回 503，应用其余功能不受影响 |
| **Worker 进程** (`server` worker) | ⬜ 可选 | 配合 Temporal 执行工作流；需与 Temporal 一起启用 |
| **DeepSeek API** | ⬜ 可选 | Copilot 与 LLM 能力；未配置时 LLM 相关功能降级 |
| **Langfuse** | ⬜ 可选 | LLM 调用链路追踪；留空则关闭追踪 |

> ⚠️ **注意**：API 服务**不托管前端静态文件**，只提供 `/api`。生产环境必须用
> Nginx（或同类）托管 `client/dist`，并把 `/api`、`/health` 反向代理到 API 服务。

---

## 2. 前置要求

- **Node.js ≥ 20**（推荐 22，项目用到 `--env-file`）
- **PostgreSQL ≥ 14**
- 可选：Temporal Server、DeepSeek API Key、Langfuse

---

## 3. 环境变量

后端读取 `server/.env`。从模板复制并填写：

```bash
cp server/.env.example server/.env
```

```env
# —— 必填 ——
DATABASE_URL=postgres://用户:密码@主机:5432/lumenedu
PORT=8787

# —— 可选：LLM（OpenAI 兼容协议）——
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# —— 可选：Temporal（启用工作流时填写）——
TEMPORAL_ADDRESS=127.0.0.1:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=lumenedu-main

# —— 可选：Langfuse 追踪（留空则关闭）——
LANGFUSE_HOST=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
```

---

## 4. 数据库

无需手动建表。API 服务启动时执行 `initDatabase()`：若 `company` 表为空，
会按 `server/src/db/schema.sql` 建表并灌入种子数据（默认用户「林桓」等）。

只需预先创建一个空数据库：

```sql
CREATE DATABASE lumenedu;
```

**重置数据库**（销毁所有数据，下次启动重新建表灌种子）：

```bash
npm --workspace server run db:reset
```

---

## 5. 构建

在仓库根目录：

```bash
npm install            # 安装所有 workspace 依赖
npm run build          # 先构建 server，再构建 client
```

产物：

- `server/dist/` — 编译后的后端（含 `schema.sql`）
- `client/dist/` — 前端静态资源

---

## 6. 启动

### 6.1 API 服务

```bash
npm --workspace server start
# 等价于：node --env-file=.env dist/index.js
```

启动成功后访问 `http://<主机>:8787/health` 应返回 `{"ok":true}`。

### 6.2 Worker 进程（仅在启用 Temporal 时）

```bash
node --env-file=server/.env server/dist/worker/index.js
```

未启用 Temporal 可跳过；方向扫描/论证类接口会返回 503，其余功能正常。

### 6.3 前端

`client/dist` 是纯静态资源，交给 Nginx 托管（见下一节）。

> 生产环境建议用 **pm2** 或 **systemd** 守护 API 服务与 Worker 进程，
> 确保崩溃自动重启、开机自启。

---

## 7. Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    root /var/www/aicompany/client/dist;
    index index.html;

    # API 反向代理到 Node 服务
    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /health {
        proxy_pass http://127.0.0.1:8787;
    }

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 8. 本地开发

```bash
npm run dev            # 同时启动前端(:5173) 与后端(:8787)
# 或分开：
npm run dev:server
npm run dev:client
```

开发模式下 Vite 自动把 `/api/*` 代理到 `:8787`，直接打开
`http://localhost:5173` 即可。启用工作流需另起 Worker：

```bash
npm --workspace server run worker
```

---

## 9. 升级部署流程

```bash
git pull
npm install
npm run build
# 重启 API 服务（与 Worker，若有）
pm2 restart lumenedu-api lumenedu-worker
```

数据库 schema 变更需在 `server/src/db/schema.sql` 中保持幂等；
`initDatabase()` 仅在空库时灌种子，已有数据的库不会被覆盖。

---

## 10. 部署检查清单

- [ ] PostgreSQL 已创建空库，`DATABASE_URL` 可连通
- [ ] `server/.env` 已配置
- [ ] `npm run build` 成功，`server/dist`、`client/dist` 已生成
- [ ] API 服务启动，`/health` 返回正常
- [ ] Nginx 托管 `client/dist` 并代理 `/api`
- [ ] （可选）Temporal + Worker 已就绪
- [ ] （可选）DeepSeek / Langfuse 凭证已填写
- [ ] 进程已由 pm2 / systemd 守护
