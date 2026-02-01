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

## Development

### Prerequisites
- Go 1.22+
- Docker & Docker Compose
- PostgreSQL (via Docker)

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

```bash
./gameserver \
  --addr=:7000 \
  --db-host=localhost \
  --db-port=7001 \
  --tick-rate=60
```

Environment variables (Docker):
- `SERVER_ADDR` - WebSocket address (default: `:7000`)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `TICK_RATE` - Game loop ticks per second

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
- PostgreSQL for persistent data (accounts, characters)
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
# Build optimized binary
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gameserver ./cmd/gameserver

# Run
./gameserver --addr=:7000
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
