# -------- Builder --------
FROM node:22-alpine AS builder
WORKDIR /app

# Install backend deps in backend/ without bringing the whole context yet
COPY backend/package*.json ./backend/
RUN npm ci --prefix ./backend

# Copy TS config + sources
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src

# Build TypeScript -> /app/backend/dist
RUN npm run build --prefix ./backend

# Copy any non-TS runtime files (e.g., your src/**/*.js, .json) into dist
# so the compiled app can require them at runtime.
# (Busybox sh; portable in Alpine)
RUN set -eux; \
  cd backend; \
  find src -type f ! -name "*.ts" ! -name "*.tsx" ! -name "*.map" -print0 \
  | while IFS= read -r -d '' f; do \
      d="dist/${f#src/}"; \
      mkdir -p "$(dirname "$d")"; \
      cp "$f" "$d"; \
    done

# -------- Runner --------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install prod deps only for backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Bring compiled output
COPY --from=builder /app/backend/dist ./dist

# The official node image includes a 'node' user already.
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]
