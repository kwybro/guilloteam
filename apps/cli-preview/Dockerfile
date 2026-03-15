FROM oven/bun:1.3.8-debian AS base

# Install dependencies for node-pty (native addon)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install terminal server dependencies
COPY container-package.json ./package.json
RUN bun install

# Copy terminal server source
COPY src/terminal-server.ts ./terminal-server.ts

# Copy pre-built CLI binary (copied into this directory by CI before docker build)
COPY guillo /usr/local/bin/guillo
RUN chmod +x /usr/local/bin/guillo

# Set up a welcome environment
RUN echo '\n\
echo ""\n\
echo "  guilloteam CLI preview"\n\
echo "  Run: guillo --help"\n\
echo ""\n\
' >> /root/.bashrc

ENV PORT=8080
ENV SHELL=/bin/bash
EXPOSE 8080

CMD ["bun", "run", "terminal-server.ts"]
