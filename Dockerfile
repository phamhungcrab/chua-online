# ==============================================================================
# TEMPLE LIVE STUDIO — PRODUCTION DOCKERFILE (MULTI-STAGE)
# Architecture: linux/amd64 (compatible with Docker Desktop WSL2)
# Base: Node.js 24 Alpine (includes native node:sqlite, WAL, TypeScript strip-types)
# ==============================================================================

# Stage 1: Build Frontend and Verify Types
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build frontend into /app/dist/client and verify TypeScript types
RUN npm run build

# ==============================================================================
# Stage 2: Minimal Production Runtime
FROM node:24-alpine AS runner

LABEL maintainer="Temple Live Studio Team"
LABEL description="Temple Live Studio — Chánh Điện Việt Nam 2.5D Livestream Server"
LABEL version="1.0.2"

# Install curl for container healthcheck and sqlite CLI for consistent inspection
RUN apk add --no-cache curl sqlite

# Create dedicated non-root application user and group
RUN addgroup -g 10001 -S temple && adduser -u 10001 -S temple -G temple

WORKDIR /app

# Copy dependency manifests and install production-only dependencies
COPY package*.json ./
RUN npm install --omit=dev --omit=optional && npm cache clean --force

# Copy compiled frontend and static assets from builder
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/public

# Copy server and shared TypeScript source (executed via native strip-types)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Prepare data persistence volume directory and set non-root ownership
RUN mkdir -p /data && chown -R temple:temple /app /data

# Configure environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DOCKER_CONTAINER=true \
    TEMPLE_DATA_DIR=/data

# Run as non-root user for security
USER temple

# Persistent storage volume for SQLite database, audio uploads, and scene assets
VOLUME ["/data"]

EXPOSE 3000

# Container healthcheck targeting the local HTTP API
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Launch production server with graceful shutdown signals (SIGINT / SIGTERM)
CMD ["node", "--experimental-strip-types", "src/server/index.ts"]
