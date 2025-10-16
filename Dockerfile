# -------- Builder: install and build backend --------
FROM node:22-slim AS builder
WORKDIR /app/backend

# Copy backend package files
COPY backend/package.json ./

# Install all dependencies (including dev dependencies needed for build)
# Use npm install since there's no package-lock.json in backend
RUN npm install

# Copy TypeScript config and source code
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Build TypeScript -> /app/backend/dist
RUN npm run build

# Copy non-TS runtime files (e.g., .txt files) into dist
# Use a simpler approach with cp -r and then remove .ts files
RUN echo "=== Copying all non-TypeScript files ===" && \
    find src -name "*.txt" -o -name "*.json" -o -name "*.js" | while read file; do \
      target="dist/${file#src/}" && \
      echo "Copying: $file -> $target" && \
      mkdir -p "$(dirname "$target")" && \
      cp "$file" "$target"; \
    done && \
    echo "=== Listing dist/modules/users/ ===" && \
    ls -la dist/modules/users/ 2>/dev/null || echo "Directory does not exist yet" && \
    echo "=== Checking for default.txt ===" && \
    find dist -name "default.txt" -exec ls -la {} \;

# -------- Runner: production runtime --------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install required system dependencies for onnxruntime and sharp
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy backend package files
COPY backend/package.json ./

# Install only production dependencies
# Use npm install (not npm ci) since there's no package-lock.json in backend
RUN npm install --omit=dev --production

# Copy compiled output from builder
COPY --from=builder /app/backend/dist ./dist

# Verify the copy worked and default.txt is present
RUN echo "Checking dist contents:" && \
    ls -la dist/modules/users/ && \
    test -f dist/modules/users/default.txt && echo "✓ default.txt found" || echo "✗ default.txt MISSING"

# Copy backend .env file(s) if present.
# This copies any file starting with ".env" from the backend directory on the build context
# (e.g., .env, .env.production, etc.) into the container's /app directory.
# The wildcard makes it optional: if no .env files exist, the build will not fail.
COPY --chown=node:node backend/.env* ./

# Fix permissions for node_modules (needed for @xenova/transformers cache)
RUN chown -R node:node /app/node_modules

# Create cache directories for transformers and give proper permissions
RUN mkdir -p /app/node_modules/@xenova/transformers/.cache && \
    chown -R node:node /app/node_modules/@xenova/transformers/.cache

# Switch to non-root user for security
USER node
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

# Start the application with increased memory and load .env file
CMD ["node", "--max-old-space-size=4096", "-r", "dotenv/config", "dist/server.js"]
