FROM oven/bun:slim as base

ARG PUBLIC_DOMAIN
ENV PUBLIC_DOMAIN=${PUBLIC_DOMAIN}

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/web

RUN bun run build

WORKDIR /app/web/build

EXPOSE 3000

CMD ["bun", "run", "start"]
