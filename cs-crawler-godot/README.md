# CS Crawler - Godot Edition

A fast-paced multiplayer top-down action RPG with procedural skills, random item generation, and dynamic combat.

## Overview

CS Crawler is a dungeon crawler inspired by games like Lucky's Tale and the LEGO Movie aesthetic. Players explore procedurally generated levels, battle intelligent enemies, customize abilities with modifiers, and collect randomly generated loot. Built with Godot 4.3+ (client) and Go (authoritative server).

### Key Features
- 🎮 **Fast-paced combat** with short cooldowns and satisfying feedback
- 🔥 **Customizable skill system** - Chain modifiers to create unique abilities (e.g., Fireball + Pet = pet that shoots fireballs)
- 🎲 **Random item generation** with stat bonuses and set items
- 🤖 **Smart enemy AI** with synergies and pack behaviors
- 🗺️ **Procedural level generation** using prefab rooms
- 👥 **Multiplayer** - Play with friends in LAN (up to 100 players)
- 📈 **Progression** - Level up damage-type proficiency and ability familiarity
- 🥽 **VR Support** (planned) - First-person dungeon crawling in VR

## Quick Start

### Prerequisites
- [Godot 4.3+](https://godotengine.org/download)
- [Go 1.22+](https://go.dev/dl/)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)

### Run the Game

#### 1. Start the Server
```bash
cd cs-crawler-godot
docker-compose up -d

# Check server logs
docker-compose logs -f gameserver
```

The server will be available at `ws://localhost:7000`

#### 2. Open the Client
```bash
# Open Godot
# File -> Import Project
# Navigate to cs-crawler-godot/client/
# Select project.godot
# Click "Import & Edit"

# Press F5 to run
```

#### 3. Play!
- Enter a username
- Create or join a game
- Use WASD to move, 1-4 to cast abilities

## Project Structure

```
cs-crawler-godot/
├── client/              # Godot 4.3+ game client
│   ├── scenes/         # Scene files (.tscn)
│   ├── scripts/        # GDScript code
│   ├── assets/         # Models, textures, audio
│   └── tests/          # Client unit tests (Gut)
├── server/             # Go game server
│   ├── cmd/           # Server entry points
│   ├── internal/      # Game logic (entities, combat, AI)
│   ├── pkg/           # Shared packages
│   └── tests/         # Server tests
├── docs/              # Documentation
│   └── implementation-plan.md  # Phased development plan
├── docker-compose.yml # Docker setup
└── README.md
```

## Development

### Backend (Go Server)

```bash
cd server

# Install dependencies
make deps

# Run tests
make test

# Run locally (without Docker)
make run

# Build binary
make build
```

See [server/README.md](server/README.md) for details.

### Client (Godot)

```bash
# Open in Godot Editor
godot --path client --editor

# Run tests (install Gut plugin first)
# Bottom panel -> Gut -> Run All
```

See [client/README.md](client/README.md) for details.

### Testing

**Backend:**
```bash
cd server
make test              # Unit tests
make test-coverage     # Coverage report
```

**Client:**
- Install [Gut](https://github.com/bitwes/Gut) plugin in Godot
- Run tests from Gut panel in editor

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up -d --build

# Run only database
docker-compose up -d postgres
```

## Implementation Plan

Development is organized into 10 phases. See [docs/implementation-plan.md](docs/implementation-plan.md) for complete details.

### Phases Overview

1. **Core Infrastructure & Movement** - Client-server connection, player movement, camera
2. **Basic Combat & Abilities** - First ability (Fireball), damage system, enemies
3. **Advanced Abilities & Modifiers** - More abilities, modifier system, pets/turrets
4. **Item System & Inventory** - Random items, equipment, stats
5. **Enemy AI & Behaviors** - Smart AI, enemy synergies, diverse types
6. **Procedural Level Generation** - WaveFunctionCollapse, room prefabs
7. **Progression & Proficiency** - Damage-type proficiency, ability familiarity
8. **Multiplayer Lobby & Social** - Lobby UI, chat, character management
9. **Polish & Game Feel** - VFX, audio, performance optimization
10. **Advanced Features & VR** - VR support, advanced modifiers, difficulty scaling

### Current Phase
**Phase 0** - Project structure setup ✅

## Technology Stack

### Client
- **Engine**: Godot 4.3+ (Forward+ renderer)
- **Language**: GDScript
- **Networking**: WebSocketPeer (built-in)
- **Testing**: Gut framework

### Server
- **Language**: Go 1.22+
- **Framework**: Standard library + Gorilla WebSocket
- **Database**: PostgreSQL 16
- **Testing**: Go testing package + testify

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Ports**:
  - `7000` - WebSocket server
  - `7001` - PostgreSQL (mapped from 5432)

### Protocol
- **Transport**: WebSocket
- **Format**: JSON (will migrate to Protobuf in later phases)

## Game Design

### Skills & Modifiers

**Base Abilities:**
- Fireball - Fire projectile with explosion
- Frostbolt - Cold projectile with slow
- Lightning - Line-based instant damage
- BasicAttack - Melee cone attack

**Modifiers:**
- Pet - Summon that follows and casts ability
- Turret - Stationary caster
- Homing - Projectiles track enemies
- Piercing - Pass through multiple targets
- *Many more planned...*

### Progression

**Damage-Type Proficiency:**
- Gain proficiency in Fire, Cold, Lightning, Physical, Poison
- Level up by dealing damage
- Bonuses: +1% damage per level, unlock new modifiers

**Ability Familiarity:**
- Level up individual abilities by using them
- Bonuses: -2% cooldown, +5% area per level

### Items

- Random generation from templates
- Rarity tiers: Normal, Rare, Unique, Set
- Attributes: Damage, resistance, speed, special effects
- Equipment slots: Head, Chest, Hands, Feet, MainHand, OffHand
- Set bonuses for wearing multiple pieces

## Visual Style

**Aesthetic:** Low-poly 3D with PBR materials (Lucky's Tale / LEGO Movie style)

**Technical:**
- Low polygon count (500-2000 tris per character)
- Vibrant colors, smooth shading
- PBR materials with plastic/toy-like sheen
- Good lighting (directional light + ambient)
- Post-processing: Bloom, SSAO, depth of field

**Models:**
- Procedurally generated for prototyping
- Proper skeletons (head, arms, legs) for animation
- BoneAttachment3D for equipped items

## Performance Targets

- **Server**: 60 TPS with 100 concurrent players
- **Client**: 60+ FPS (90+ for VR mode)
- **Network**: <100ms latency (depends on connection)

## Contributing

1. Read [docs/implementation-plan.md](docs/implementation-plan.md)
2. Pick a task from current phase
3. Write tests FIRST (TDD encouraged)
4. Implement feature
5. Run tests (`make test` for backend, Gut for client)
6. Commit with clear message referencing phase

## Roadmap

**v0.1** - Core gameplay loop (Phases 1-3)
- Movement, basic combat, abilities, modifiers

**v0.2** - Progression systems (Phases 4-7)
- Items, inventory, AI, level generation, proficiency

**v0.3** - Multiplayer & polish (Phases 8-9)
- Lobby, chat, VFX, audio, performance

**v0.4** - Advanced features (Phase 10)
- VR support, advanced modifiers, difficulty scaling

**v1.0** - Launch
- All core features complete, balanced, polished

## Future Plans

- Character classes and skill trees
- Boss encounters with unique mechanics
- Crafting and item enhancement
- Trading and economy
- Guilds and parties
- Leaderboards and competitive seasons
- Mobile support
- Steam integration
- Custom map editor

## License

[Your License Here]

## Credits

Inspired by the original CS Crawler project (Node.js + Pixi.js version).

Developed with ❤️ using Godot and Go.

---

**Get Started:** Follow the Quick Start guide above or dive into [docs/implementation-plan.md](docs/implementation-plan.md) to begin development!
