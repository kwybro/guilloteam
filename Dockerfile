FROM oven/bun:1.3.8

WORKDIR /app
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/cli/package.json apps/cli/package.json
COPY apps/mcp/package.json apps/mcp/package.json
COPY apps/service/package.json apps/service/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/learning-client/package.json packages/learning-client/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/storage-postgres/package.json packages/storage-postgres/package.json
RUN bun install --frozen-lockfile

COPY apps/service apps/service
COPY packages/core packages/core
COPY packages/learning-client packages/learning-client
COPY packages/storage-postgres packages/storage-postgres

EXPOSE 3400
CMD ["bun", "run", "apps/service/src/index.ts"]
