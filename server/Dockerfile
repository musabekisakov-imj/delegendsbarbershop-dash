# ─── Stage 1: build ──────────────────────────────────────────
# Compiles TypeScript and generates the Prisma client. Heavy stage —
# discarded after we copy the artefacts into the runtime image.
FROM node:20-alpine AS build
WORKDIR /app

# Copy lockfile + manifest first so npm ci layer caches when only
# source changes (lockfile dictates the install graph).
COPY package.json package-lock.json ./
RUN npm ci

# Prisma needs the schema before we can `prisma generate`.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ─── Stage 2: runtime ────────────────────────────────────────
# Slim image — no compiler, no source, no dev deps. Runs as non-root.
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# OpenSSL is required by Prisma's query engine on Alpine.
RUN apk add --no-cache openssl tini

# Copy compiled output + production node_modules + Prisma artefacts.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# Run as the bundled non-root user — limits blast radius if compromised.
USER node

EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
