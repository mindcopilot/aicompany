import type {
  DashboardPayload, Direction, PipelineStage, Channel, FunnelStep,
  KnowledgeItem, PromptItem, SkillItem, AgentProfile, AgentRun, Automation,
  ContentTrack, ContentJob, ModelMatrix, LibraryItem, CopilotMessage,
  AuthSession, SendCodeResp, QrSceneResp, WechatPoll,
  WorkflowStartResp, WorkflowGetResp,
  MyDirection, TrendingDirection, DirectionValidation,
} from "../types/api";

const TOKEN_KEY = "lumenedu.token.v1";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null): void {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return mutate<T>("POST", path, body);
}
async function patch<T>(path: string, body: unknown): Promise<T> {
  return mutate<T>("PATCH", path, body);
}
async function del<T>(path: string): Promise<T> {
  return mutate<T>("DELETE", path);
}
async function mutate<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { error?: string }).error ?? ""; } catch {}
    throw new Error(detail || `${method} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  dashboard:    () => get<DashboardPayload>("/dashboard"),
  directions:   () => get<Direction[]>("/directions"),
  pipeline:     () => get<PipelineStage[]>("/pipeline"),
  channels:     () => get<Channel[]>("/channels"),
  funnel:       () => get<FunnelStep[]>("/funnel"),
  knowledge:    () => get<KnowledgeItem[]>("/knowledge"),
  prompts:      () => get<PromptItem[]>("/prompts"),
  skills:       () => get<SkillItem[]>("/skills"),
  agents:       () => get<AgentProfile[]>("/agents"),
  runsToday:    () => get<AgentRun[]>("/runs-today"),
  automations:  () => get<Automation[]>("/automations"),
  tracks:       () => get<ContentTrack[]>("/content/tracks"),
  jobs:         () => get<ContentJob[]>("/content/jobs"),
  models:       () => get<ModelMatrix[]>("/content/models"),
  library:      () => get<LibraryItem[]>("/content/library"),
  copilotInit:  () => get<CopilotMessage[]>("/copilot/init"),
  copilotSend:  (text: string) => post<CopilotMessage>("/copilot/message", { text }),

  workflows: {
    scanDirections: (thesis?: string) =>
      post<WorkflowStartResp>("/workflows/scan-directions", thesis ? { thesis } : {}),
    get: (id: string) => get<WorkflowGetResp>(`/workflows/${encodeURIComponent(id)}`),
  },

  myDirections: {
    list:    () => get<MyDirection[]>("/my-directions"),
    create:  (body: { title: string; description?: string; tags?: string[] }) =>
              post<MyDirection>("/my-directions", body),
    update:  (id: string, body: { title?: string; description?: string | null; tags?: string[] }) =>
              patch<MyDirection>(`/my-directions/${encodeURIComponent(id)}`, body),
    remove:  (id: string) => del<{ ok: true }>(`/my-directions/${encodeURIComponent(id)}`),
    evaluate:(id: string) => post<WorkflowStartResp>(`/my-directions/${encodeURIComponent(id)}/evaluate`, {}),
    validate:(id: string) => post<WorkflowStartResp>(`/my-directions/${encodeURIComponent(id)}/validate`, {}),
    validations: (id: string) => get<DirectionValidation[]>(`/my-directions/${encodeURIComponent(id)}/validations`),
    fromTrending: (trendingId: string) =>
              post<MyDirection>(`/my-directions/from-trending/${encodeURIComponent(trendingId)}`, {}),
  },
  trendingDirections: {
    list:    () => get<TrendingDirection[]>("/trending-directions"),
    refresh: () => post<WorkflowStartResp>("/trending-directions/refresh", {}),
  },

  auth: {
    me:           () => get<AuthSession>("/auth/me"),
    devLogin:     () => post<AuthSession>("/auth/dev-login", {}),
    sendCode:     (phone: string) => post<SendCodeResp>("/auth/phone/send-code", { phone }),
    verifyPhone:  (phone: string, code: string) => post<AuthSession>("/auth/phone/verify", { phone, code }),
    wechatQr:     () => post<QrSceneResp>("/auth/wechat/qr", {}),
    wechatPoll:   (sceneId: string) => get<WechatPoll>(`/auth/wechat/poll?scene=${encodeURIComponent(sceneId)}`),
    logout:       () => post<{ ok: true }>("/auth/logout", {}),
  },
};
