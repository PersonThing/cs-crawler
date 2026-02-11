# CS Crawler - Go Game Server

Authoritative game server for CS Crawler multiplayer action RPG.

## Project Structure

```
server/
├── cmd/
│   └── gameserver/      # Main entry point
├── internal/            # Private application code
│   ├── game/           # Game logic (entities, world, combat)
│   ├── entities/       # Entity definitions
│   ├── combat/         # Combat system
│   ├── network/        # WebSocket server and clients
│   ├── database/       # Database layer
│   └── lobby/          # Lobby and matchmaking
├── pkg/                # Public shared packages
│   ├── protocol/       # Network protocol definitions
│   └── models/         # Shared data models
└── tests/              # Integration tests
```

## Quick Start - Single Player Mode

**New!** No database setup required for single-player:

```bash
# Build the server (Windows)
build.bat

# Build the server (Linux/Mac)
./build.sh

# Run with SQLite (no PostgreSQL needed!)
./gameserver -db-type sqlite
```

The game client can automatically start this server for offline play!

See [SINGLE_PLAYER_QUICKSTART.md](../SINGLE_PLAYER_QUICKSTART.md) for details.

## Development

### Prerequisites
- Go 1.23+
- **For single-player**: Nothing else needed! (uses SQLite)
- **For multiplayer**: Docker & Docker Compose, PostgreSQL

### Setup
```bash
# Install dependencies
make deps

# Start database
docker-compose up -d postgres

# Run server locally
make run

# Run tests
make test

# View test coverage
make test-coverage
```

### Running with Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f gameserver

# Rebuild after changes
docker-compose up -d --build
```

## Testing

### Unit Tests
```bash
# Run all tests
go test ./... -v

# Run specific package
go test ./internal/game -v

# Run with coverage
go test ./... -cover
```

### Integration Tests
```bash
# Tests that require database
go test ./tests/integration -v
```

### Load Tests
```bash
# Simulate 100 concurrent players
go test ./tests/load -v -timeout 30m
```

## Configuration

Server is configured via command-line flags or environment variables:

### Single-Player (SQLite)
```bash
./gameserver \
  --addr=:7000 \
  --db-type=sqlite \
  --db-file=./data/players.db \
  --tick-rate=60
```

### Multiplayer (PostgreSQL)
```bash
./gameserver \
  --addr=:7000 \
  --db-type=postgres \
  --db-host=localhost \
  --db-port=7001 \
  --tick-rate=60
```

### All Configuration Options

**Server:**
- `SERVER_ADDR` / `--addr` - WebSocket address (default: `:7000`)
- `TICK_RATE` / `--tick-rate` - Game loop ticks per second (default: `60`)

**Database:**
- `DB_TYPE` / `--db-type` - Database type: `sqlite` or `postgres` (default: `sqlite`)

**SQLite (single-player):**
- `DB_FILE` / `--db-file` - SQLite database file path (default: `./data/players.db`)

**PostgreSQL (multiplayer):**
- `DB_HOST` / `--db-host` - PostgreSQL host (default: `localhost`)
- `DB_PORT` / `--db-port` - PostgreSQL port (default: `7001`)
- `DB_USER` / `--db-user` - Database user (default: `crawler`)
- `DB_PASSWORD` / `--db-password` - Database password (default: `crawler`)
- `DB_NAME` / `--db-name` - Database name (default: `crawler`)

## Architecture

### Game Loop
- Runs at 60 TPS (configurable)
- Updates all active worlds each tick
- Broadcasts state to connected clients

### World Management
- Each game session is a separate World
- Worlds are isolated (no cross-world interaction)
- Worlds can be created/destroyed dynamically

### Networking
- WebSocket protocol (port 7000)
- JSON message format
- Client-server architecture (server is authoritative)

### Database
- **SQLite** for single-player (lightweight, no setup required)
- **PostgreSQL** for multiplayer (scalable, concurrent access)
- In-memory for game state (positions, health, etc.)
- Optional Redis for session caching

## API

### WebSocket Endpoint
`ws://localhost:7000/ws`

### Message Types

**Client → Server:**
```json
{"type": "join", "username": "Player1", "worldID": "game-123"}
{"type": "move", "velocity": {"x": 1.0, "y": 0.0, "z": 0.0}}
{"type": "use_ability", "abilityID": "fireball", "target": {"x": 10, "y": 0, "z": 5}}
```

**Server → Client:**
```json
{"type": "joined", "playerID": "p-123", "worldID": "game-123"}
{"type": "world_state", "players": [...], "enemies": [...], "projectiles": [...]}
```

## Performance

### Targets
- 60 TPS stable with 100 concurrent players
- <50ms average tick time
- <100ms message latency (network dependent)
- <500MB memory per world instance

### Profiling
```bash
# CPU profiling
go test -cpuprofile=cpu.prof -bench=.
go tool pprof cpu.prof

# Memory profiling
go test -memprofile=mem.prof -bench=.
go tool pprof mem.prof
```

## Deployment

### Production Build
```bash
# Build optimized binary (pure Go, no CGO needed)
GOOS=linux go build -o gameserver ./cmd/gameserver

# Run with SQLite (single-player)
./gameserver --addr=:7000 --db-type=sqlite

# Run with PostgreSQL (multiplayer)
./gameserver --addr=:7000 --db-type=postgres --db-host=your-db-host
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Write tests FIRST (TDD)
2. Run `make test` before committing
3. Follow Go style guidelines (`gofmt`, `golint`)
4. Document public APIs
5. Reference implementation plan phases in commits

## License

[Your License Here]
