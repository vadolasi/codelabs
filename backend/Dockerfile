FROM oven/bun:slim as base

WORKDIR /app

COPY . .

RUN CI=true bun install --frozen-lockfile

WORKDIR /app/backend

EXPOSE 8080

CMD ["pm2-runtime", "start", "pm2.config.js"]
