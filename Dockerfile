# Backend-only image. Build context is the repo root (not backend/) because
# the pnpm workspace's "catalog:" dependency protocol needs pnpm-workspace.yaml
# and the root lockfile present to resolve — see backend/package.json.
FROM node:20.20.2-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter backend run build

# dist/index.mjs is a fully-bundled esbuild output (see backend/build.mjs) —
# no node_modules needed at runtime, just the dist directory.
FROM node:20.20.2-slim AS runtime
WORKDIR /app
COPY --from=build /app/backend/dist ./backend/dist
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "backend/dist/index.mjs"]
