# LumenEdu · AI Founder OS

TypeScript fullstack implementation of the LumenEdu design — an AI-driven management console for a solo founder running a microcourse business (LumenEdu).

## Stack

- **Frontend** — Vite + React 18 + TypeScript, faithful port of the design's JSX prototypes
- **Backend** — Express + TypeScript, serves all mock data and the Copilot reply endpoint
- **Shared types** — `client/src/types/` mirrors `server/src/data/` so both ends agree on shape

## Layout

```
aicompany/
├── client/   Vite + React + TS frontend
└── server/   Express + TS backend (mock data + Copilot)
```

## Run

```
# install
npm install

# dev (concurrently runs client at :5173 and server at :8787)
npm run dev:server   # in one terminal
npm run dev:client   # in another

# build
npm run build
```

Frontend proxies `/api/*` to the server, so just open `http://localhost:5173`.

## Modules (matches the design)

| # | Module | Path |
|---|--------|------|
| — | Dashboard | `client/src/views/Dashboard.tsx` |
| 01 | 方向选择 Direction Selection | `views/Direction.tsx` |
| 02 | 方向论证 Direction Validation | `views/Validation.tsx` |
| 03 | 业务线上化 Business Digitalization | `views/Product.tsx` |
| 04 | 内容工厂 Content Studio | `views/Content.tsx` |
| 04 | 流量分发 Traffic | `views/Traffic.tsx` |
| 05 | 用户触达 Reach | `views/Reach.tsx` |
| 06 | 数据中心 Data Validation | `views/Data.tsx` |
| 05–09 | AI 资产 Intelligence: 知识库 / Prompts / Skills / Agent 编排 / 自动化 | `views/{Knowledge,Prompts,Skills,Agents,Automations}.tsx` |
| Global | Atlas Copilot 浮层 | `components/Copilot.tsx` |
