#!/bin/bash

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
until nc -z redis 6379; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done
echo "Redis is ready!"

# Start the BrowserQuest server
echo "Starting BrowserQuest server..."
node server.js 