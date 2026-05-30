import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool, query } from "./pool.js";

import { COMPANY, DIRECTIONS, PIPELINE, CHANNELS, FUNNEL, ACTIVITY, COPILOT_INIT } from "../data/core.js";
import { KNOWLEDGE, PROMPTS, SKILLS, AGENTS, RUNS_TODAY, AUTOMATIONS } from "../data/intelligence.js";
import { TRACKS, JOBS, MODELS, LIBRARY } from "../data/content.js";
import { MANAGED_MODELS } from "../data/managed-models.js";

const here = dirname(fileURLToPath(import.meta.url));

export async function initDatabase(): Promise<void> {
  const schema = await readFile(join(here, "schema.sql"), "utf8");
  await pool.query(schema);

  const { rows } = await query<{ c: string }>("SELECT COUNT(*)::text AS c FROM company");
  if (Number(rows[0]?.c ?? 0) > 0) {
    console.log("[db] schema present, seed skipped");
    await backfillIfEmpty();
    return;
  }

  console.log("[db] empty database — seeding…");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO company (id, name, short_name, stage, founded, team, thesis)
       VALUES (1, $1, $2, $3, $4, $5, $6)`,
      [COMPANY.name, COMPANY.shortName, COMPANY.stage, COMPANY.founded, COMPANY.team, COMPANY.thesis]
    );

    for (let i = 0; i < DIRECTIONS.length; i++) {
      const d = DIRECTIONS[i]!;
      await client.query(
        `INSERT INTO directions (id, name, score, selected, tam, growth, competition, fit, summary, why, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [d.id, d.name, d.score, !!d.selected,
         JSON.stringify(d.tam), JSON.stringify(d.growth), JSON.stringify(d.competition), JSON.stringify(d.fit),
         d.summary, d.why ? JSON.stringify(d.why) : null, i]
      );
    }

    for (let i = 0; i < PIPELINE.length; i++) {
      const p = PIPELINE[i]!;
      await client.query(
        `INSERT INTO pipeline_stages (key, step, title, status, description, meta, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [p.key, p.step, p.title, p.status, p.desc, p.meta, i]
      );
    }

    for (let i = 0; i < CHANNELS.length; i++) {
      const c = CHANNELS[i]!;
      await client.query(
        `INSERT INTO channels (id, name, handle, color, letter, is_on, posts, reach, ctr, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [c.id, c.name, c.handle, c.color, c.letter, c.on, c.posts, c.reach, c.ctr, i]
      );
    }

    for (let i = 0; i < FUNNEL.length; i++) {
      const f = FUNNEL[i]!;
      await client.query(
        `INSERT INTO funnel (label, count, conv, position) VALUES ($1,$2,$3,$4)`,
        [f.label, f.count, f.conv, i]
      );
    }

    for (let i = 0; i < ACTIVITY.length; i++) {
      const a = ACTIVITY[i]!;
      await client.query(
        `INSERT INTO activity (t, who, ai, what, obj, extra, position) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.t, a.who, a.ai, a.what, a.obj, a.extra ?? null, i]
      );
    }

    for (const m of COPILOT_INIT) {
      await client.query(
        `INSERT INTO copilot_messages (session_id, from_role, text, tool, is_seed)
         VALUES ('default', $1, $2, $3, TRUE)`,
        [m.from, m.text, m.tool ? JSON.stringify(m.tool) : null]
      );
    }

    for (let i = 0; i < KNOWLEDGE.length; i++) {
      const k = KNOWLEDGE[i]!;
      await client.query(
        `INSERT INTO knowledge (id, kind, title, snippet, tags, refs, agent, time, source, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [k.id, k.kind, k.title, k.snippet, JSON.stringify(k.tags), k.refs, k.agent, k.time, k.source, i]
      );
    }

    for (let i = 0; i < PROMPTS.length; i++) {
      const p = PROMPTS[i]!;
      await client.query(
        `INSERT INTO prompts (id, name, cat, version, calls, success, description, vars, used_by, body, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [p.id, p.name, p.cat, p.version, p.calls, p.success, p.desc, JSON.stringify(p.vars), JSON.stringify(p.usedBy), p.body, i]
      );
    }

    for (let i = 0; i < SKILLS.length; i++) {
      const s = SKILLS[i]!;
      await client.query(
        `INSERT INTO skills (id, name, emoji, cat, description, tools, input, output, calls, success, agents, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [s.id, s.name, s.emoji, s.cat, s.desc, JSON.stringify(s.tools), s.input, s.output, s.calls, s.success, JSON.stringify(s.agents), i]
      );
    }

    for (let i = 0; i < AGENTS.length; i++) {
      const a = AGENTS[i]!;
      await client.query(
        `INSERT INTO agents (id, name, role, color, mood, busy, task_now, skills, prompts, sources, schedule, today, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [a.id, a.name, a.role, a.color, a.mood, a.busy, a.taskNow,
         JSON.stringify(a.skills), JSON.stringify(a.prompts), JSON.stringify(a.sources),
         a.schedule, JSON.stringify(a.today), i]
      );
    }

    for (let i = 0; i < RUNS_TODAY.length; i++) {
      const r = RUNS_TODAY[i]!;
      await client.query(
        `INSERT INTO agent_runs_today (agent, start_h, end_h, label, position) VALUES ($1,$2,$3,$4,$5)`,
        [r.agent, r.start, r.end, r.label, i]
      );
    }

    for (let i = 0; i < AUTOMATIONS.length; i++) {
      const a = AUTOMATIONS[i]!;
      await client.query(
        `INSERT INTO automations (id, name, is_on, runs, last_run, trigger, steps, saved, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [a.id, a.name, a.on, a.runs, a.lastRun, JSON.stringify(a.trigger), JSON.stringify(a.steps), a.saved, i]
      );
    }

    for (let i = 0; i < TRACKS.length; i++) {
      const t = TRACKS[i]!;
      await client.query(
        `INSERT INTO content_tracks (id, name, icon, color, description, best_for, duration, typical_cost, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [t.id, t.name, t.icon, t.color, t.desc, t.bestFor, t.duration, t.typicalCost, i]
      );
    }

    for (let i = 0; i < JOBS.length; i++) {
      const j = JOBS[i]!;
      await client.query(
        `INSERT INTO content_jobs (id, track, title, status, progress, eta, model, phase, agent, cost, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [j.id, j.track, j.title, j.status, j.progress, j.eta, j.model, j.phase, j.agent, j.cost, i]
      );
    }

    for (let i = 0; i < MODELS.length; i++) {
      const m = MODELS[i]!;
      await client.query(
        `INSERT INTO content_models (name, vendor, uses, rating, strengths, cost, calls, color, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [m.name, m.vendor, JSON.stringify(m.uses), m.rating, m.strengths, m.cost, m.calls, m.color, i]
      );
    }

    for (let i = 0; i < LIBRARY.length; i++) {
      const l = LIBRARY[i]!;
      await client.query(
        `INSERT INTO content_library (id, track, title, meta, time, cost, model, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [l.id, l.track, l.title, l.meta, l.time, l.cost, l.model, i]
      );
    }

    for (let i = 0; i < MANAGED_MODELS.length; i++) {
      const m = MANAGED_MODELS[i]!;
      await client.query(
        `INSERT INTO managed_models
           (id, name, vendor, category, modality, context, pricing, rating, latency,
            calls, spend, strengths, tags, enabled, default_for, color, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17)`,
        [m.id, m.name, m.vendor, m.category, m.modality, m.context, m.pricing, m.rating, m.latency,
         m.calls, m.spend, m.strengths, JSON.stringify(m.tags), m.enabled, m.defaultFor, m.color, i]
      );
    }

    // Default user — the "founder" the dashboard greets. WeChat QR mock
    // resolves to this user; phone-login users are created on demand.
    await client.query(
      `INSERT INTO users (id, phone, wechat_openid, name, initials, role)
       VALUES ('user-lin-huan', NULL, 'wx_lumenedu_lh', '林桓', 'LH', 'founder')
       ON CONFLICT (id) DO NOTHING`
    );

    await client.query(
      `INSERT INTO founder_profiles (user_id, profile) VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      ["user-lin-huan", JSON.stringify({
        tags: "SaaS · Indie · DX",
        hours: "20 小时 / 周",
        capital: "¥30,000",
        risk: "中等",
        interests: ["独立开发", "AI 应用", "中文教育", "B2B SaaS"],
        thesis: "用 AI 把独立开发者的真实经验沉淀为可交付的微课产品。",
      })]
    );

    // Seed two starter "my_directions" so the page isn't empty on first load.
    // Both are user-recorded (source = "user"); evaluation is NULL until the
    // user manually triggers Helix scoring.
    const seedMyDirs: Array<{ id: string; title: string; description: string; tags: string[] }> = [
      {
        id: "md-indie-dev-edu",
        title: "Indie Developer 中文微课",
        description: "面向想做 side project 的开发者，4 小时可完成的实战微课，按结果付费。",
        tags: ["教育", "Indie", "AI"],
      },
      {
        id: "md-interior-designer-ai",
        title: "室内设计师 AI 出图 SaaS",
        description: "AI 户型出图 + 选材清单的订阅工具，目标独立设计师 / 小工作室。",
        tags: ["设计", "AI", "SaaS"],
      },
    ];
    for (let i = 0; i < seedMyDirs.length; i++) {
      const d = seedMyDirs[i]!;
      await client.query(
        `INSERT INTO my_directions (id, user_id, title, description, tags, source, position)
         VALUES ($1, 'user-lin-huan', $2, $3, $4::jsonb, 'user', $5)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, d.title, d.description, JSON.stringify(d.tags), i]
      );
    }

    await client.query("COMMIT");
    console.log("[db] seed complete");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Idempotent backfill for tables added after the initial schema. Runs on every
 * boot when the database is already initialised; only inserts rows for tables
 * that are still empty so it's safe to re-run.
 */
async function backfillIfEmpty(): Promise<void> {
  const { rows } = await query<{ c: string }>("SELECT COUNT(*)::text AS c FROM managed_models");
  if (Number(rows[0]?.c ?? 0) > 0) return;
  console.log("[db] backfilling managed_models…");
  for (let i = 0; i < MANAGED_MODELS.length; i++) {
    const m = MANAGED_MODELS[i]!;
    await query(
      `INSERT INTO managed_models
         (id, name, vendor, category, modality, context, pricing, rating, latency,
          calls, spend, strengths, tags, enabled, default_for, color, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.name, m.vendor, m.category, m.modality, m.context, m.pricing, m.rating, m.latency,
       m.calls, m.spend, m.strengths, JSON.stringify(m.tags), m.enabled, m.defaultFor, m.color, i]
    );
  }
}
