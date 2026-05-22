// Shared Temporal Connection + Client. Reused by:
// - worker/index.ts (the worker process — connects via @temporalio/worker's NativeConnection)
// - routes/workflows.ts (the API process — uses @temporalio/client to start workflows)
//
// Pool the client so we don't pay TCP setup per request.

import { Client, Connection } from "@temporalio/client";

const address = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
const namespace = process.env.TEMPORAL_NAMESPACE ?? "default";
export const taskQueue = process.env.TEMPORAL_TASK_QUEUE ?? "lumenedu-main";

let cachedClient: Promise<Client> | null = null;

export function getClient(): Promise<Client> {
  if (!cachedClient) {
    cachedClient = Connection.connect({ address }).then(connection => new Client({ connection, namespace }));
  }
  return cachedClient;
}
