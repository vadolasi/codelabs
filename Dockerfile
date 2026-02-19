FROM oven/bun:1 AS builder

WORKDIR /app

ENV LEFTHOOK=0

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun svelte-kit sync && \
  mkdir -p /app/data && \
  bun run fswatcher:build && \
  bun run icons:prepare && \
  bun run emails:compile && \
  BUILD=true bun run build

FROM oven/bun:1 AS prod-deps

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --production --frozen-lockfile

FROM oven/bun:1-slim AS production

WORKDIR /app

ENV NODE_ENV=production

ENV PORT=3000

COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/data ./data
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json

RUN chown -R bun:bun /app

USER bun

EXPOSE 3000

CMD ["bun", "run", "--bun", "build/index.js"]
