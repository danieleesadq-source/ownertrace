// One-off bundler for a Vercel serverless deployment of the backend.
// Unlike build.mjs (which targets src/index.ts and calls app.listen()), this
// bundles src/app.ts directly — Vercel's Node runtime wants a module that
// exports a request handler, not a process that binds to a port.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir, rename } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  // Build into a scratch dir first — esbuild-plugin-pino emits worker helper
  // files alongside the main bundle, and anything placed directly under
  // vercel-deploy/api/ gets treated by Vercel as its own serverless function.
  // Those workers are never actually invoked (pino-pretty only runs outside
  // production, see logger.ts) but esbuild needs them to exist to satisfy
  // pino's static worker-thread resolution at bundle time.
  const buildDir = path.resolve(artifactDir, "vercel-deploy/.pino-workers");
  await rm(buildDir, { recursive: true, force: true });
  await mkdir(buildDir, { recursive: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/app.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: buildDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node", "sharp", "better-sqlite3", "sqlite3", "canvas", "bcrypt", "argon2",
      "fsevents", "re2", "farmhash", "xxhash-addon", "bufferutil", "utf-8-validate",
      "ssh2", "cpu-features", "dtrace-provider", "isolated-vm", "lightningcss",
      "pg-native", "oracledb", "mongodb-client-encryption", "nodemailer", "handlebars",
      "knex", "typeorm", "protobufjs", "onnxruntime-node", "@tensorflow/*",
      "@prisma/client", "@mikro-orm/*", "@grpc/*", "@swc/*", "@aws-sdk/*", "@azure/*",
      "@opentelemetry/*", "@google-cloud/*", "@google/*", "googleapis", "firebase-admin",
      "@parcel/watcher", "@sentry/profiling-node", "@tree-sitter/*", "aws-sdk",
      "classic-level", "dd-trace", "ffi-napi", "grpc", "hiredis", "kerberos",
      "leveldown", "miniflare", "mysql2", "newrelic", "odbc", "piscina", "realm",
      "ref-napi", "rocksdb", "sass-embedded", "sequelize", "serialport", "snappy",
      "tinypool", "usb", "workerd", "wrangler", "zeromq", "zeromq-prebuilt",
      "playwright", "puppeteer", "puppeteer-core", "electron",
    ],
    sourcemap: false,
    plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

async function main() {
  await buildAll();
  const buildDir = path.resolve(artifactDir, "vercel-deploy/.pino-workers");
  const apiDir = path.resolve(artifactDir, "vercel-deploy/api");
  await rm(apiDir, { recursive: true, force: true });
  await mkdir(apiDir, { recursive: true });
  // A fixed function name (routed to via vercel.json's rewrite rule below)
  // rather than the [...path] filesystem catch-all convention — that
  // convention silently 404s at the platform level for any request with
  // more than one path segment after /api/ (e.g. /api/entity/p1), while
  // single-segment paths (/api/search) work fine. Root cause unclear, but
  // an explicit rewrite sidesteps it entirely and is the more standard
  // pattern for "send every request to one Express app" anyway.
  await rename(path.resolve(buildDir, "app.mjs"), path.resolve(apiDir, "index.mjs"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
