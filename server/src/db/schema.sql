-- LumenEdu · AI Founder OS — schema
-- Idempotent: safe to re-run. All tables are dropped+recreated by init.ts on first boot
-- when the company table is empty (i.e. fresh database). See db/init.ts.

CREATE TABLE IF NOT EXISTS company (
  id          INT PRIMARY KEY DEFAULT 1,
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  stage       TEXT NOT NULL,
  founded     TEXT NOT NULL,
  team        TEXT NOT NULL,
  thesis      TEXT NOT NULL,
  CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS directions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  score       INT  NOT NULL,
  selected    BOOLEAN NOT NULL DEFAULT FALSE,
  tam         JSONB NOT NULL,
  growth      JSONB NOT NULL,
  competition JSONB NOT NULL,
  fit         JSONB NOT NULL,
  summary     TEXT NOT NULL,
  why         JSONB,
  position    INT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  key     TEXT PRIMARY KEY,
  step    TEXT NOT NULL,
  title   TEXT NOT NULL,
  status  TEXT NOT NULL CHECK (status IN ('done','current','pending')),
  description TEXT NOT NULL,
  meta    TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS channels (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  handle TEXT NOT NULL,
  color  TEXT NOT NULL,
  letter TEXT NOT NULL,
  is_on  BOOLEAN NOT NULL,
  posts  INT  NOT NULL,
  reach  TEXT NOT NULL,
  ctr    TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS funnel (
  id    SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  count INT  NOT NULL,
  conv  TEXT,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id    SERIAL PRIMARY KEY,
  t     TEXT NOT NULL,
  who   TEXT NOT NULL,
  ai    BOOLEAN NOT NULL,
  what  TEXT NOT NULL,
  obj   TEXT NOT NULL,
  extra TEXT,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL DEFAULT 'default',
  from_role   TEXT NOT NULL CHECK (from_role IN ('ai','user')),
  text        TEXT NOT NULL,
  tool        JSONB,
  is_seed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS copilot_messages_session_created_idx
  ON copilot_messages (session_id, created_at);

CREATE TABLE IF NOT EXISTS knowledge (
  id      TEXT PRIMARY KEY,
  kind    TEXT NOT NULL,
  title   TEXT NOT NULL,
  snippet TEXT NOT NULL,
  tags    JSONB NOT NULL,
  refs    INT  NOT NULL,
  agent   TEXT NOT NULL,
  time    TEXT NOT NULL,
  source  TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  cat     TEXT NOT NULL,
  version TEXT NOT NULL,
  calls   INT  NOT NULL,
  success INT  NOT NULL,
  description TEXT NOT NULL,
  vars    JSONB NOT NULL,
  used_by JSONB NOT NULL,
  body    TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  emoji   TEXT NOT NULL,
  cat     TEXT NOT NULL,
  description TEXT NOT NULL,
  tools   JSONB NOT NULL,
  input   TEXT NOT NULL,
  output  TEXT NOT NULL,
  calls   INT  NOT NULL,
  success INT  NOT NULL,
  agents  JSONB NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  role     TEXT NOT NULL,
  color    TEXT NOT NULL,
  mood     TEXT NOT NULL,
  busy     BOOLEAN NOT NULL,
  task_now TEXT NOT NULL,
  skills   JSONB NOT NULL,
  prompts  JSONB NOT NULL,
  sources  JSONB NOT NULL,
  schedule TEXT NOT NULL,
  today    JSONB NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runs_today (
  id    SERIAL PRIMARY KEY,
  agent TEXT NOT NULL,
  start_h NUMERIC(4,1) NOT NULL,
  end_h   NUMERIC(4,1) NOT NULL,
  label TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS automations (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  is_on    BOOLEAN NOT NULL,
  runs     INT  NOT NULL,
  last_run TEXT NOT NULL,
  trigger  JSONB NOT NULL,
  steps    JSONB NOT NULL,
  saved    TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_tracks (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,
  color       TEXT NOT NULL,
  description TEXT NOT NULL,
  best_for    TEXT NOT NULL,
  duration    TEXT NOT NULL,
  typical_cost TEXT NOT NULL,
  position    INT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_jobs (
  id       TEXT PRIMARY KEY,
  track    TEXT NOT NULL REFERENCES content_tracks(id),
  title    TEXT NOT NULL,
  status   TEXT NOT NULL CHECK (status IN ('running','queued','review','done')),
  progress INT  NOT NULL,
  eta      TEXT NOT NULL,
  model    TEXT NOT NULL,
  phase    TEXT NOT NULL,
  agent    TEXT NOT NULL,
  cost     TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_models (
  name      TEXT PRIMARY KEY,
  vendor    TEXT NOT NULL,
  uses      JSONB NOT NULL,
  rating    INT  NOT NULL,
  strengths TEXT NOT NULL,
  cost      TEXT NOT NULL,
  calls     INT  NOT NULL,
  color     TEXT NOT NULL,
  position  INT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_library (
  id    TEXT PRIMARY KEY,
  track TEXT NOT NULL REFERENCES content_tracks(id),
  title TEXT NOT NULL,
  meta  TEXT NOT NULL,
  time  TEXT NOT NULL,
  cost  TEXT NOT NULL,
  model TEXT NOT NULL,
  position INT NOT NULL
);

-- ============================================================================
-- Auth
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  phone         TEXT UNIQUE,
  wechat_openid TEXT UNIQUE,
  name          TEXT NOT NULL,
  initials      TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'founder',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token        TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('phone','wechat')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx    ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at);

-- ============================================================================
-- Workflow execution (Temporal-backed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_runs (
  id                TEXT PRIMARY KEY,             -- Temporal workflowId
  run_id            TEXT NOT NULL,                -- Temporal runId
  workflow_type     TEXT NOT NULL,                -- "scanDirections" | "copilotTurn" | ...
  status            TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED')),
  trigger           TEXT,                         -- "user:click_scan" | "copilot:tool" | ...
  user_id           TEXT REFERENCES users(id),
  input             JSONB,
  output            JSONB,
  error             TEXT,
  current_activity  TEXT,                         -- latest activity name for cheap progress display
  langfuse_trace_id TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS workflow_runs_user_started_idx ON workflow_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS workflow_runs_type_started_idx ON workflow_runs(workflow_type, started_at DESC);

CREATE TABLE IF NOT EXISTS workflow_events (
  id          BIGSERIAL PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind        TEXT NOT NULL,                      -- "workflow_started" | "activity_started" | "activity_completed" | "log" | "workflow_completed" | "workflow_failed"
  activity    TEXT,
  message     TEXT,
  payload     JSONB
);
CREATE INDEX IF NOT EXISTS workflow_events_wf_ts_idx ON workflow_events(workflow_id, ts);

CREATE TABLE IF NOT EXISTS founder_profiles (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile    JSONB NOT NULL,                      -- {tags, hours, capital, risk, interests, thesis?}
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Direction selection (creator-owned ideas + trending exploration)
-- Replaces the old `directions` table conceptually. The legacy table stays
-- around for back-compat with the dashboard summary but is no longer wired up.
-- ============================================================================

CREATE TABLE IF NOT EXISTS my_directions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  tags        JSONB NOT NULL DEFAULT '[]'::jsonb,
  source      TEXT NOT NULL DEFAULT 'user',        -- "user" | "from_trending:<trending_id>"
  evaluation  JSONB,                              -- {score, tam, growth, competition, fit, why[], evaluatedAt}
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS my_directions_user_pos_idx ON my_directions(user_id, position);

CREATE TABLE IF NOT EXISTS trending_directions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  source      TEXT NOT NULL,                      -- "github" | "v2ex" | "consolidated" | ...
  source_url  TEXT,
  score_proxy NUMERIC,                            -- raw popularity signal (stars / hot rank / etc.)
  meta        JSONB,                              -- source-specific extras
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trending_directions_fetched_idx ON trending_directions(fetched_at DESC);

-- Deep validation results for one direction across 4 dimensions.
-- Each (direction_id, kind) is a single most-recent run; re-validating overwrites.
CREATE TABLE IF NOT EXISTS direction_validations (
  direction_id  TEXT NOT NULL REFERENCES my_directions(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('market','competitor','feasibility','user')),
  status        TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
  workflow_id   TEXT,
  result        JSONB,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  PRIMARY KEY (direction_id, kind)
);
CREATE INDEX IF NOT EXISTS direction_validations_wf_idx ON direction_validations(workflow_id);

-- ============================================================================
-- 业务线上化 · AI-generated design + downstream delivery
-- ============================================================================

-- AI-generated business design for one direction. Two kinds run in parallel:
-- 'operations' (产品运营体系) and 'traffic' (流量获取手段). One (direction, kind)
-- row per most-recent run; re-designing overwrites.
CREATE TABLE IF NOT EXISTS business_designs (
  direction_id  TEXT NOT NULL REFERENCES my_directions(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('operations','traffic')),
  status        TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
  workflow_id   TEXT,
  result        JSONB,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  PRIMARY KEY (direction_id, kind)
);
CREATE INDEX IF NOT EXISTS business_designs_wf_idx ON business_designs(workflow_id);

-- Delivery tickets handed off from 业务线上化 design to the execution modules
-- (内容工厂 / 流量分发). Regenerated each time the producing design re-runs.
CREATE TABLE IF NOT EXISTS delivery_tickets (
  id            TEXT PRIMARY KEY,
  direction_id  TEXT NOT NULL REFERENCES my_directions(id) ON DELETE CASCADE,
  target        TEXT NOT NULL CHECK (target IN ('content','traffic')),
  source_kind   TEXT NOT NULL CHECK (source_kind IN ('operations','traffic')),
  title         TEXT NOT NULL,
  detail        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS delivery_tickets_target_idx ON delivery_tickets(target, created_at DESC);
CREATE INDEX IF NOT EXISTS delivery_tickets_dir_idx ON delivery_tickets(direction_id);
