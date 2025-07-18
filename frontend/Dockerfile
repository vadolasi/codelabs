FROM oven/bun:slim as base

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/frontend

RUN bun run build

WORKDIR /app/frontend/build

EXPOSE 3000

CMD ["bun", "run", "start"]
