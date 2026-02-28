# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl    # Required by Prisma on Alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build ──
FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (needed at compile time — NestJS imports @prisma/client)
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# Prune dev dependencies, then re-generate Prisma client with production deps
RUN npm prune --production
RUN npx prisma generate

# ── Stage 3: Production ──
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy production artifacts only
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./

# Copy Prisma schema + migrations (needed by the migration Job at deploy time)
COPY --from=build --chown=appuser:appgroup /app/prisma ./prisma

USER appuser

ENV NODE_ENV=production

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "dist/main.js"]
