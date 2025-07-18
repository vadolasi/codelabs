FROM oven/bun:slim AS base

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/backend

CMD ["bun", "run", "start"]
