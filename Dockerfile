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

# Set default environment variables (these should be overridden at runtime)
ENV NODE_ENV=production \
    PORT=3000 \
    # AWS Bedrock credentials for Claude Code will be passed from .env file
    AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
    AWS_REGION=${AWS_REGION} \
    CLAUDE_CODE_USE_BEDROCK=${CLAUDE_CODE_USE_BEDROCK} \
    ANTHROPIC_MODEL=${ANTHROPIC_MODEL}

# Run the application
CMD ["node", "src/index.js"]