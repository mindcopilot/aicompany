import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import api from "./routes/api.js";
import auth from "./routes/auth.js";
import workflows from "./routes/workflows.js";
import directions from "./routes/directions.js";
import { initDatabase } from "./db/init.js";

const PORT = Number(process.env.PORT) || 8787;

async function main() {
  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, app: "LumenEdu API" }));
  app.use("/api/auth", auth);
  app.use("/api/workflows", workflows);
  app.use("/api", directions);
  app.use("/api", api);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error("[api error]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  };
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`LumenEdu API listening on http://localhost:${PORT}`);
  });
}

void main().catch(err => {
  console.error("[fatal] failed to start:", err);
  process.exit(1);
});
