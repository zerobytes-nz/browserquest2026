# BrowserQuest Docker Setup

This document explains how to run BrowserQuest using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Build and start the containers:**
   ```bash
   docker-compose up --build
   ```

2. **Access the game:**
   - Open your browser and go to `http://localhost:8000`
   - The game should be running and ready to play!

## Services

### BrowserQuest Game Server
- **Port:** 8000
- **Description:** The main game server running the BrowserQuest MMO
- **Dependencies:** Redis

### Redis Database
- **Port:** 6379
- **Description:** Database for storing game state and player data
- **Persistence:** Data is persisted in a Docker volume

## Development

### Running in detached mode:
```bash
docker-compose up -d
```

### Viewing logs:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs browserquest
docker-compose logs redis
```

### Stopping the services:
```bash
docker-compose down
```

### Stopping and removing volumes:
```bash
docker-compose down -v
```

## Configuration

The game server configuration can be modified in `server/config.json`. The Docker setup uses the following environment variables:

- `REDIS_HOST`: Redis server hostname (default: redis)
- `REDIS_PORT`: Redis server port (default: 6379)
- `NODE_ENV`: Node.js environment (default: production)

## Troubleshooting

### Port already in use
If port 8000 is already in use, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Use port 8001 on host
```

### Redis connection issues
The startup script waits for Redis to be ready before starting the game server. If you encounter connection issues, check the logs:
```bash
docker-compose logs browserquest
```

### Building the image manually
```bash
docker build -t browserquest .
docker run -p 8000:8000 browserquest
``` 