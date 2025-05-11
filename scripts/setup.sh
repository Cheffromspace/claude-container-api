#!/bin/bash
set -e

# Create required directories
mkdir -p logs

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env file. Please update it with your actual values."
else
  echo ".env file already exists."
fi

# Install dependencies
npm install

echo "Setup complete! Update your .env file with your GitHub token, webhook secret, and Claude API key."
echo "Then start the server with: npm start"
echo "Or for development: npm run dev"