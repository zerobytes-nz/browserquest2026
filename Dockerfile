# Use Node.js 18 (more modern than the original 0.10.x requirement)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ netcat-openbsd

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Make startup script executable
RUN chmod +x start.sh

# Create necessary directories
RUN mkdir -p logs

# Expose the game server port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/status', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the game server directly
CMD ["node", "server.js"] 