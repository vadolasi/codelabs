FROM oven/bun:slim as base

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

WORKDIR /app/realtime-server

EXPOSE 8080

CMD ["bun", "run", "start"]
