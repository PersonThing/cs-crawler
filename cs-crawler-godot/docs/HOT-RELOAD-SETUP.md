# Hot Reload Setup with Air

The gameserver is configured with Air for automatic reloading on code changes.

## How It Works

- **Air** watches Go files for changes
- **Polling enabled** (`poll = true`, interval: 500ms) for Docker compatibility
- **Auto toolchain** (`GOTOOLCHAIN=auto`) to support latest Air features

## Configuration

**File: `.air.toml`**
- `poll = true` - Use polling instead of fsnotify (required for Docker)
- `poll_interval = 500` - Check every 500ms
- Watches: `.go` files
- Excludes: `_test.go` files during rebuild

**Docker Compose:**
- Uses `Dockerfile.dev` with Air installed
- Mounts `./server` volume for live code sync
- Restarts container automatically on crashes

## Testing Hot Reload

1. **Start server:**
   ```bash
   docker-compose up -d
   docker-compose logs -f gameserver
   ```

2. **Edit a Go file:**
   ```bash
   # Edit any .go file in server/
   echo '// test change' >> server/internal/game/entity.go
   ```

3. **Watch logs - should see:**
   ```
   main.go has changed
   building...
   running...
   CS Crawler Game Server starting...
   ```

## Ports

- **7000**: WebSocket server
- **7001**: PostgreSQL (mapped from 5432)

## Troubleshooting

**Changes not detected:**
- Check polling is enabled: `poll = true` in `.air.toml`
- Increase poll_interval if on slow filesystem
- Verify volume mount: `docker-compose config | grep volumes`

**Build errors:**
- Check logs: `docker-compose logs gameserver`
- Rebuild: `docker-compose up -d --build`

**Air not running:**
```bash
# Exec into container
docker exec -it cs-crawler-server sh

# Check if air is installed
which air

# Check if air is running
ps aux | grep air
```
