# -------- Builder: install backend workspace via root lockfile --------
FROM node:22-alpine AS builder
WORKDIR /app

# Copy root manifest + lockfile and backend manifest so npm sees the workspace
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json

# Install deps for ONLY the backend workspace (includes dev deps for build)
RUN npm ci --workspace backend --include-workspace-root=false

# Copy TS config + sources
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src

# Build TypeScript -> /app/backend/dist
RUN npm run -w backend build

# Copy non-TS runtime files (e.g., .js, .json under src/) into dist
RUN set -eux; \
  cd backend; \
  find src -type f ! -name "*.ts" ! -name "*.tsx" ! -name "*.map" -print0 \
  | while IFS= read -r -d '' f; do \
      d="dist/${f#src/}"; \
      mkdir -p "$(dirname "$d")"; \
      cp "$f" "$d"; \
    done

# -------- Runner: prod-only deps for backend workspace --------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Use the same root lockfile to install ONLY prod deps for backend
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false

# Bring compiled output
COPY --from=builder /app/backend/dist ./dist

USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]
