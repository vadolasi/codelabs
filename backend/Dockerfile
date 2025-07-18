FROM oven/bun:slim AS base

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/backend

EXPOSE 8000

CMD ["bun", "run", "start"]
