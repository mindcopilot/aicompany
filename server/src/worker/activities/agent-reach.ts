// agent-reach activities — wrappers around the CLIs the user has installed
// (`gh`, V2EX public API, jina r.jina.ai). All are read-only network calls.
//
// These return normalized RawTrendingItem[] so the consolidator activity can
// fan them into one LLM call.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RawTrendingItem {
  source: string;          // "github" | "v2ex" | "producthunt"
  title: string;
  description: string | null;
  url: string | null;
  scoreProxy: number | null;
  meta?: Record<string, unknown>;
}

const FETCH_TIMEOUT_MS = 15_000;
const GH_TIMEOUT_MS = 20_000;

// ----------------------- GitHub trending repos -----------------------
//
// `gh search repos` ranked by stars + filtered by recent push gives a decent
// "what's hot in builder-land" signal. We hit a few queries because GitHub's
// API doesn't have a true "trending" endpoint anymore.

export async function searchGithubTrending(input: {
  queries?: string[];
  limit?: number;
}): Promise<RawTrendingItem[]> {
  const queries = input.queries ?? ["AI agent", "AI SaaS", "indie dev tool", "AI 教育"];
  const limit = input.limit ?? 5;
  const out: RawTrendingItem[] = [];
  for (const q of queries) {
    try {
      const { stdout } = await execFileAsync(
        "gh",
        ["search", "repos", q, "--sort", "stars", "--limit", String(limit),
         "--json", "fullName,description,stargazersCount,url,language,pushedAt"],
        { timeout: GH_TIMEOUT_MS },
      );
      const items = JSON.parse(stdout) as Array<{
        fullName: string; description: string | null;
        stargazersCount: number; url: string;
        language: string | null; pushedAt: string;
      }>;
      for (const it of items) {
        out.push({
          source: "github",
          title: it.fullName,
          description: it.description,
          url: it.url,
          scoreProxy: it.stargazersCount,
          meta: { language: it.language, pushedAt: it.pushedAt, query: q },
        });
      }
    } catch (err) {
      // One bad query shouldn't sink the whole batch.
      console.warn(`[agent-reach] gh search '${q}' failed:`, err instanceof Error ? err.message : err);
    }
  }
  return out;
}

// ----------------------- V2EX "ideas" node -----------------------

export async function fetchV2exIdeas(): Promise<RawTrendingItem[]> {
  try {
    const res = await fetch("https://www.v2ex.com/api/topics/show.json?node_name=ideas", {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`v2ex ${res.status}`);
    const arr = (await res.json()) as Array<{
      id: number; title: string; content: string;
      replies: number; url: string; node: { name: string };
    }>;
    return arr.slice(0, 15).map((t): RawTrendingItem => ({
      source: "v2ex",
      title: t.title,
      description: t.content ? t.content.slice(0, 300) : null,
      url: t.url,
      scoreProxy: t.replies,
      meta: { node: t.node?.name },
    }));
  } catch (err) {
    console.warn("[agent-reach] v2ex fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ----------------------- Product Hunt homepage (via jina.ai) -----------------------
//
// Product Hunt has no free API; r.jina.ai gives us markdown of the homepage,
// from which we can extract product names + taglines via a follow-up LLM step.
// We just return one chunky RawTrendingItem and let the consolidator decide
// what to extract.

export async function fetchProductHuntDigest(): Promise<RawTrendingItem[]> {
  try {
    const res = await fetch("https://r.jina.ai/https://www.producthunt.com/", {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`jina ${res.status}`);
    const text = await res.text();
    // Trim to the meaningful upper portion — jina returns 10-30KB; LLM context cost matters.
    const truncated = text.slice(0, 5000);
    return [{
      source: "producthunt",
      title: "Product Hunt — Today's Launches",
      description: truncated,
      url: "https://www.producthunt.com/",
      scoreProxy: null,
      meta: { fetchedAt: new Date().toISOString() },
    }];
  } catch (err) {
    console.warn("[agent-reach] producthunt fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ----------------------- Aggregator (called from workflow) -----------------------

export async function gatherAllTrendingSignals(input: {
  githubQueries?: string[];
}): Promise<RawTrendingItem[]> {
  const [gh, v2, ph] = await Promise.all([
    searchGithubTrending(input.githubQueries ? { queries: input.githubQueries } : {}),
    fetchV2exIdeas(),
    fetchProductHuntDigest(),
  ]);
  return [...gh, ...v2, ...ph];
}
