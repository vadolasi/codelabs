FROM oven/bun:slim AS base

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile && bun run build

WORKDIR /app/frontend

CMD ["bun", "run", "preview"]
