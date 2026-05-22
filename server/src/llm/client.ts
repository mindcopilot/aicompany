// DeepSeek LLM client with optional Langfuse tracing.
//
// Why DeepSeek via OpenAI SDK: DeepSeek's API is OpenAI-compatible, so we reuse
// the openai package by overriding baseURL — no separate client to maintain.
//
// Why Langfuse: we want token-level cost + latency observability across all
// agent workflows. If keys aren't configured, we log a warning once and let
// LLM calls go through untrace​d so dev isn't blocked on secrets.

import OpenAI from "openai";
import { Langfuse } from "langfuse";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

const apiKey = process.env.DEEPSEEK_API_KEY;
const baseURL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";
const defaultModel = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

if (!apiKey) {
  console.warn("[llm] DEEPSEEK_API_KEY missing — LLM calls will fail");
}

const openai = new OpenAI({ apiKey: apiKey ?? "missing", baseURL });

const lfPub = process.env.LANGFUSE_PUBLIC_KEY;
const lfSec = process.env.LANGFUSE_SECRET_KEY;
const lfHost = process.env.LANGFUSE_HOST ?? "http://127.0.0.1:3030";

let langfuse: Langfuse | null = null;
if (lfPub && lfSec) {
  langfuse = new Langfuse({ publicKey: lfPub, secretKey: lfSec, baseUrl: lfHost });
  console.log(`[llm] langfuse tracing enabled → ${lfHost}`);
} else {
  console.warn("[llm] LANGFUSE_(PUBLIC|SECRET)_KEY missing — tracing disabled");
}

export interface ChatInput {
  messages: ChatCompletionMessageParam[];
  /** Logical name for this generation, surfaced in Langfuse */
  traceName: string;
  /** Group multiple LLM calls under one trace (e.g. a workflowId) */
  traceId?: string;
  /** Optional Langfuse sessionId — usually copilot session id */
  sessionId?: string;
  /** Optional userId so traces can be filtered per founder */
  userId?: string;
  /** Override default model */
  model?: string;
  temperature?: number;
  /** If true, request JSON-shaped response from DeepSeek */
  json?: boolean;
  /** Free-form metadata to attach to the Langfuse generation */
  metadata?: Record<string, unknown>;
}

export interface ChatOutput {
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export async function chat(input: ChatInput): Promise<ChatOutput> {
  const model = input.model ?? defaultModel;

  const trace = langfuse?.trace({
    id: input.traceId,
    name: input.traceName,
    sessionId: input.sessionId,
    userId: input.userId,
    metadata: input.metadata,
  });
  const gen = trace?.generation({
    name: input.traceName,
    model,
    input: input.messages,
    modelParameters: {
      temperature: input.temperature ?? 0.7,
      ...(input.json ? { response_format: "json_object" } : {}),
    },
  });

  try {
    const req: ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      ...(input.json ? { response_format: { type: "json_object" } } : {}),
    };
    const res = await openai.chat.completions.create(req);
    const content = res.choices[0]?.message?.content ?? "";
    const usage = res.usage
      ? {
          promptTokens: res.usage.prompt_tokens,
          completionTokens: res.usage.completion_tokens,
          totalTokens: res.usage.total_tokens,
        }
      : undefined;

    gen?.end({
      output: content,
      usage: usage
        ? { input: usage.promptTokens, output: usage.completionTokens, total: usage.totalTokens }
        : undefined,
    });
    await langfuse?.flushAsync().catch(() => undefined);
    return { content, usage, model };
  } catch (err) {
    gen?.end({ level: "ERROR", statusMessage: err instanceof Error ? err.message : String(err) });
    await langfuse?.flushAsync().catch(() => undefined);
    throw err;
  }
}

/** Parse a JSON-mode LLM response, tolerating ```json fences and stray prose. */
export function parseJson<T = unknown>(content: string): T {
  let s = content.trim();
  // Strip ```json ... ``` fence if present
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1]!.trim();
  // Fall back to first {...} or [...] block
  if (!(s.startsWith("{") || s.startsWith("["))) {
    const m = s.match(/[{[][\s\S]*[}\]]/);
    if (m) s = m[0];
  }
  return JSON.parse(s) as T;
}
