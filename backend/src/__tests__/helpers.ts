/**
 * Shared helper for integration tests: boots the real Express app (backed by
 * the real seeded CognoDB instance — these are integration tests, not
 * mocked unit tests) on an ephemeral port, and tears it down after.
 */
import type { Server } from "http";
import app from "../app.js";
import { closeDriver } from "../db/driver.js";

export async function startTestServer(): Promise<{ baseUrl: string; server: Server }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ baseUrl: `http://127.0.0.1:${port}`, server });
    });
  });
}

export async function stopTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    // server.close()'s callback only fires once every connection has ended.
    // fetch() (undici) keeps connections alive by default, so without
    // forcibly closing them here this would hang indefinitely instead of
    // ever resolving.
    server.close((err) => (err ? reject(err) : resolve()));
    server.closeAllConnections();
  });
  // The neo4j driver's connection pool keeps its own open sockets/timers
  // that never unref themselves — without closing it explicitly, the test
  // process hangs after every test has already passed, since the event
  // loop never empties.
  await closeDriver();
}
