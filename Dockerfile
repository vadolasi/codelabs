FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run fswatcher:build
RUN bun run icons:prepare
RUN bun run emails:compile

RUN bun run build

RUN mkdir -p /app/data

FROM oven/bun:1-distroless

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["build/index.js"]
