FROM node:18-slim

# Install git, Claude Code, and required dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY . .

# We're now using the real Claude Code CLI instead of the mock

# Expose the port
EXPOSE 3000

# Set environment variables (these should be overridden at runtime)
ENV NODE_ENV=production \
    PORT=3000 \
    # AWS Bedrock credentials for Claude Code
    AWS_ACCESS_KEY_ID=AKIA2FZ2QRU6LZNXXUI2 \
    AWS_SECRET_ACCESS_KEY=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 \
    AWS_REGION=us-east-2 \
    CLAUDE_CODE_USE_BEDROCK=1 \
    ANTHROPIC_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0

# Run the application
CMD ["node", "src/index.js"]