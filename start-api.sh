#!/bin/bash

# Kill any processes using port 3003
echo "Checking for existing processes on port 3003..."
pid=$(lsof -ti:3003)
if [ ! -z "$pid" ]; then
  echo "Found process $pid using port 3003, killing it..."
  kill -9 $pid
fi

# Start the server with a specific port
echo "Starting server on port 3003..."
PORT=3003 node src/index.js