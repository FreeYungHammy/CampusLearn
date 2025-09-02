# -------- Builder: backend-only install + build --------
FROM node:20-alpine AS builder
WORKDIR /app

# Install ONLY backend deps (no workspaces)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Provide root tsconfig because backend/tsconfig.json extends "../tsconfig.json"
COPY tsconfig.json ./tsconfig.json

# Copy backend tsconfig + sources
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src

# Build TypeScript -> /app/backend/dist
RUN npm run build

# -------- Runner: prod-only deps + compiled JS --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Bring backend package + node_modules from builder, then prune dev deps
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

# Bring compiled output
COPY --from=builder /app/backend/dist ./dist

EXPOSE 5000
CMD ["node", "dist/server.js"]
