FROM node:24-slim AS base

RUN npm install -g bun

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/frontend

RUN bun run build

EXPOSE 3000

CMD ["node", "build"]
