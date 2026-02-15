FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run fswatcher:build
RUN bun run icons:prepare
RUN bun run emails:compile

RUN mkdir -p /app/data

RUN BUILD=true bun run build

FROM oven/bun:1-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/data ./data

RUN chown -R bun:bun /app

USER bun

EXPOSE 3000

CMD ["bun", "build/index.js"]
