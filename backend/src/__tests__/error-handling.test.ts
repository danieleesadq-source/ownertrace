/**
 * Confirms graceful error handling when CognoDB is unreachable: kill the
 * connection (here, via a deliberately wrong password) and verify the API
 * returns a clear error response rather than crashing.
 *
 * This spawns the real server as a child process with a deliberately wrong
 * password (isolated from the working driver singleton the other test files
 * share) rather than mocking anything, so it's testing the real failure path.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

const TEST_PORT = 5799;

function waitForListening(child: ChildProcessByStdio<null, Readable, Readable>, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for server to start")), timeoutMs);
    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes("Backend server listening")) {
        clearTimeout(timer);
        child.stdout.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
  });
}

test("API returns a clean 503, not a crash, when the database is unreachable", async () => {
  // Invoke the locally installed tsx binary directly rather than through
  // npx — npx can stall trying to resolve/verify the package against the
  // registry even when it's already present locally.
  const child = spawn("./node_modules/.bin/tsx", ["src/index.ts"], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      COGNODB_URI: process.env.COGNODB_URI,
      COGNODB_USER: process.env.COGNODB_USER,
      COGNODB_PASSWORD: "intentionally-wrong-password-for-testing",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForListening(child);

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/search?q=Marcus`);
    assert.equal(res.status, 503);
    const body = (await res.json()) as any;
    assert.ok(body.error, "should return a plain-language error message");
    assert.doesNotMatch(body.error, /password|Neo4jError|unauthorized/i, "error message must not leak internal details");

    // The server must still be alive and answering after the failed request.
    const health = await fetch(`http://127.0.0.1:${TEST_PORT}/api/healthz`);
    assert.equal(health.status, 200);
  } finally {
    child.kill();
  }
});
