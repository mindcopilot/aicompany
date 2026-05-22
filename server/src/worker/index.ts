// Temporal worker entrypoint. Runs as `npm --workspace server run worker`.
// Independent of the API server — both processes connect to Temporal at
// 127.0.0.1:7233 (agentos-infra-temporal-1) and share the lumenedu-main queue.

import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as activities from "./activities/index.js";

const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const address = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE ?? "default";
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE ?? "lumenedu-main";

  console.log(`[worker] connecting to Temporal ${address} ns=${namespace} queue=${taskQueue}`);
  const connection = await NativeConnection.connect({ address });

  // tsx runs source .ts directly; Temporal's bundler needs the on-disk path.
  // Try the .ts file first (dev), then .js (compiled).
  const { existsSync } = await import("node:fs");
  const candidates = [
    resolve(here, "./workflows/index.ts"),
    resolve(here, "./workflows/index.js"),
  ];
  const workflowsPath = candidates.find(existsSync) ?? candidates[0]!;

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath,
    activities,
  });

  console.log("[worker] ready");
  await worker.run();
}

main().catch(err => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
