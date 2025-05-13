FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max_old_space_size=30000 --max-http-header-size=80000"
ENV NODE_ENV=production

LABEL org.opencontainers.image.source=https://github.com/any4ai/AnyCrawl
LABEL org.opencontainers.image.description="AnyCrawl API Server"
LABEL org.opencontainers.image.licenses=MIT

# Install system dependencies
RUN apk add --no-cache \
    wget \
    gnupg \
    procps \
    && corepack enable

# Add non-root user
RUN addgroup -S myuser && adduser -S myuser -G myuser \
    && mkdir -p /usr/src/app/storage \
    && chown -R myuser:myuser /usr/src/app \
    && mkdir -p /usr/src/app/db \
    && chown -R myuser:myuser /usr/src/app/db

FROM base AS build
WORKDIR /usr/src/app

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies and build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build --filter=!docs

FROM base AS api
WORKDIR /usr/src/app

# Copy built files and dependencies
COPY --from=build /usr/src/app/apps/api /usr/src/app/apps/api
COPY --from=build /usr/src/app/package.json /usr/src/app/pnpm-lock.yaml /usr/src/app/pnpm-workspace.yaml ./
COPY --from=build /usr/src/app/packages ./packages
COPY --from=build /usr/src/app/node_modules ./node_modules

# Install production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

WORKDIR /usr/src/app/apps/api
EXPOSE 8080

# Make entrypoint script executable before switching user
RUN chmod +x docker-entrypoint.sh

USER myuser

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
ENTRYPOINT ["/usr/src/app/apps/api/docker-entrypoint.sh"]
