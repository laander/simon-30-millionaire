# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs vinext

COPY --from=builder --chown=vinext:nodejs /app/dist/standalone ./
# vinext's standalone tracer does not currently include its React peer
# dependencies, even though the production server imports them at runtime.
COPY --from=builder --chown=vinext:nodejs /app/node_modules/react ./node_modules/react
COPY --from=builder --chown=vinext:nodejs /app/node_modules/react-dom ./node_modules/react-dom
COPY --from=builder --chown=vinext:nodejs /app/node_modules/react-server-dom-webpack ./node_modules/react-server-dom-webpack
COPY --from=builder --chown=vinext:nodejs /app/node_modules/scheduler ./node_modules/scheduler

USER vinext

EXPOSE 8080

CMD ["node", "server.js"]
