FROM node:24-slim AS base

RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/frontend

RUN bun run build

CMD ["bun", "run", "preview"]
