FROM oven/bun:slim AS base

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/frontend

RUN bun run build

CMD ["bun", "run", "preview"]
