- Screen shake ? kinda gross and feels too 1st person-y
- Ability modifiers per ability, not global
  - Clicking slot pops up a dialog for selecting abilities and modifiers
  - Display active modifiers on ability icons
- HUD sucks
  - Friendly healthbars
  - action bar better
  - healthbar above action bar
  - cast bar + cast timer for some spells
- Give players, enemies, and minions models with skeleton - import models from free sources
- Esc should close inv
- Floating damage numbers on hit, color-coded by damage type ?
  - Unit test: Each ability's damage calculation
  - Unit test: Status effect application/removal
- Items
  - Set items - design a few sets, look at existing sets
  - Items have some fixed attributes, can't be all random
  - Item system from original game copied more or less

- Character panel w/ stats, or put on same inv panel
   - Aggregate stats from equipped items
   - Apply stats to player (damage, health, speed, etc.)
   - Set bonuses (track set pieces)
   - **Tests**:
     - Unit test: Stat aggregation
     - Unit test: Set bonus calculation

- Get free models for all item types
- Attach items to character when equipping
- Enemy AI doesnt seem to work
- I can only see 1 kind of enemy.. need more to spawn, maybe randomly spawn a bunch on level load ?
- Cant test enemy synergy

## Phase 6: Procedural Level Generation

**Goal**: Generate random levels using prefab rooms and WaveFunctionCollapse.

### Backend Tasks
1. **Level Data Model**
   - Define room structure (dimensions, connections, spawn points)
   - Implement level graph (rooms + corridors)
   - Serialize level for client
   - **Tests**:
     - Unit test: Room connection validation
     - Unit test: Level serialization

2. **Level Generation Algorithm**
   - Create room prefab definitions
   - Implement WaveFunctionCollapse or BSP tree algorithm
   - Place enemy spawns based on room type
   - Place loot chests
   - **Tests**:
     - Unit test: Algorithm produces valid layouts
     - Integration test: Generated levels are playable

3. **World Management**
   - Generate level on world creation
   - Send level data to clients
   - Handle level transitions (future: multi-level dungeons)
   - **Tests**:
     - Integration test: Level generation and loading

### Client Tasks
1. **Room Prefabs**
   - Create 10-15 room scenes (combat, treasure, corridor, boss)
   - Design with low-poly models and good lighting
   - Add navigation mesh for each room
   - **Tests**:
     - Manual test: Room quality and variety

2. **Level Assembly**
   - Receive level data from server
   - Instantiate rooms at correct positions
   - Connect rooms visually (doorways, corridors)
   - **Tests**:
     - Integration test: Level loads correctly
     - Manual test: Visual continuity

3. **Lighting & Atmosphere**
   - Per-room lighting setups
   - Fog/atmospheric effects
   - Ambient sounds
   - **Tests**:
     - Manual test: Atmosphere quality

### Deliverables
- ✅ Levels generate procedurally
- ✅ Each level is unique and playable
- ✅ Rooms connect properly
- ✅ Enemies and loot spawn appropriately

**Estimated Complexity**: Very High (procedural generation is hard)

---

## Phase 7: Progression & Proficiency

**Goal**: Implement damage-type proficiency and ability familiarity systems.

### Backend Tasks
1. **Proficiency System**
   - Track damage dealt per damage type (Fire, Cold, Lightning, etc.)
   - Level up proficiency at thresholds (every 100 damage)
   - Grant bonuses per level (+1% damage, unlock modifiers)
   - **Tests**:
     - Unit test: Proficiency tracking
     - Unit test: Level-up calculation
     - Integration test: Proficiency persistence

2. **Ability Familiarity**
   - Track casts per ability
   - Level up at thresholds (every 50 casts)
   - Grant bonuses (-2% cooldown, +5% area)
   - **Tests**:
     - Unit test: Familiarity tracking
     - Unit test: Bonus application

3. **Persistence**
   - Save proficiency/familiarity to database
   - Load on character login
   - **Tests**:
     - Integration test: Data persistence

### Client Tasks
1. **Progression UI**
   - Proficiency panel showing levels and progress
   - Ability familiarity in tooltip
   - Level-up notifications
   - **Tests**:
     - Unit test: UI updates on progression
     - Manual test: UI clarity

2. **Visual Feedback**
   - Particle effect on level-up
   - Sound effect for progression
   - **Tests**:
     - Manual test: Feedback quality

### Deliverables
- ✅ Proficiency system functional
- ✅ Players gain power as they use damage types
- ✅ Ability familiarity rewards specialization
- ✅ Progression persists across sessions

**Estimated Complexity**: Medium (mostly data tracking)

---

## Phase 8: Multiplayer Lobby & Social

**Goal**: Full lobby system with game creation, join requests, and chat.

### Backend Tasks
1. **Lobby Service**
   - List active games (name, player count, privacy)
   - Create game with settings (max players, auto-join)
   - Join request system for private games
   - **Tests**:
     - Unit test: Game listing
     - Integration test: Join request flow

2. **Chat System**
   - Broadcast chat messages to world
   - Message sanitization (prevent exploits)
   - Chat commands (future: /whisper, /party)
   - **Tests**:
     - Unit test: Message sanitization
     - Integration test: Chat broadcast

3. **Character Management**
   - Multiple characters per account
   - Character select on login
   - Character creation/deletion
   - **Tests**:
     - Integration test: Character CRUD operations

### Client Tasks
1. **Lobby UI**
   - Game list with filters
   - Create game dialog
   - Join request system
   - **Tests**:
     - Unit test: UI state management
     - Manual test: UI usability

2. **Chat UI**
   - Scrolling message log
   - Input field (Enter to open)
   - Message fade-out
   - **Tests**:
     - Unit test: Message rendering
     - Manual test: UI usability

3. **Character Select**
   - Character list screen
   - Creation dialog
   - Preview 3D model
   - **Tests**:
     - Manual test: UI flow

### Deliverables
- ✅ Players can create and join games
- ✅ Private games require approval
- ✅ Chat system works
- ✅ Multiple characters per account

**Estimated Complexity**: Medium-High (networking + UI)

---

## Phase 9: Polish & Game Feel

**Goal**: Make the game satisfying and juicy to play.

### Backend Tasks
1. **Balance Tuning**
   - Adjust enemy HP/damage curves
   - Tune ability cooldowns and damage
   - Balance item stat ranges
   - **Tests**:
     - Playtesting sessions

2. **Performance Optimization**
   - Profile server performance
   - Optimize entity updates (spatial partitioning)
   - Reduce message size
   - **Tests**:
     - Load test: 100 players simulation
     - Performance test: Tick rate stability

### Client Tasks
1. **Visual Polish**
   - Add screen shake for impacts
   - Hitstop (freeze frames) on heavy hits
   - Camera bob/tilt for effects
   - Enhanced particles
   - **Tests**:
     - Manual test: Feel quality

2. **Audio**
   - Ability sound effects
   - Hit sounds (impact, death)
   - UI sounds (clicks, notifications)
   - Ambient music
   - **Tests**:
     - Manual test: Audio quality

3. **UI Polish**
   - Smooth transitions
   - Tooltips and feedback
   - Loading screens
   - **Tests**:
     - Manual test: UI responsiveness

4. **Performance Optimization**
   - LOD for distant entities
   - Occlusion culling
   - Particle limits
   - **Tests**:
     - Performance test: FPS stability

### Deliverables
- ✅ Game feels impactful and responsive
- ✅ Audio enhances experience
- ✅ Smooth performance at 60+ FPS
- ✅ UI is polished and clear

**Estimated Complexity**: Medium (iterative polish)

---

## Phase 10: Advanced Features & VR Support

**Goal**: Add advanced modifiers and VR mode.

### Backend Tasks
1. **Advanced Modifiers**
   - Chain modifier (hits jump to nearby enemies)
   - Split modifier (projectiles split)
   - Bounce modifier (projectiles bounce off walls)
   - Cooldown Link modifier (reduces other ability cooldowns)
   - **Tests**:
     - Unit test: Each modifier's logic
     - Integration test: Modifier combinations

2. **Difficulty Scaling**
   - Dynamic difficulty based on player count
   - Wave system (spawn rates increase over time)
   - Elite enemies with random modifiers
   - **Tests**:
     - Unit test: Scaling calculation
     - Playtesting

### Client Tasks
1. **VR Support**
   - Configure OpenXR plugin
   - VR camera rig (fixed perspective but head tracking)
   - VR UI (spatial panels, diegetic elements)
   - Controller input mapping
   - **Tests**:
     - Manual test: VR comfort and usability

2. **Advanced VFX**
   - Shader effects (distortion, dissolve)
   - Procedural animations
   - Dynamic lighting
   - **Tests**:
     - Manual test: Visual quality

3. **Accessibility**
   - Colorblind modes
   - Adjustable text sizes
   - Keybind customization
   - **Tests**:
     - Manual test: Accessibility features

### Deliverables
- ✅ VR mode functional and comfortable
- ✅ Advanced modifiers add depth
- ✅ Difficulty scales appropriately
- ✅ Game is accessible

**Estimated Complexity**: Very High (VR is complex)

---

## Testing Strategy (All Phases)

### Backend Testing
- **Unit Tests**: Cover all game logic (entities, abilities, items, AI)
  - Use `testing` package and `testify` assertions
  - Aim for 80%+ coverage
  - Run with `make test`

- **Integration Tests**: Test full request-response cycles
  - WebSocket message handling
  - Database operations
  - Multi-client scenarios
  - Run with `make test`

- **Load Tests**: Simulate high player counts
  - Use `goroutines` to simulate clients
  - Test server stability at 100 concurrent players
  - Monitor CPU/memory usage

### Client Testing
- **Unit Tests**: Use Gut framework for GDScript
  - Test game logic (stats, abilities, UI)
  - Test input handling
  - Run from Godot editor test panel

- **Integration Tests**: Test client-server sync
  - Mock server responses
  - Test network error handling

- **Manual Tests**: Visual and gameplay validation
  - Playtesting sessions
  - Bug reporting workflow

### Continuous Integration
- Set up GitHub Actions (future):
  - Run backend tests on PR
  - Run client tests (Godot headless mode)
  - Build Docker images

---

## Development Workflow

### Starting Development
```bash
# Start all services
cd cs-crawler-godot
docker-compose up -d

# Check logs
docker-compose logs -f gameserver

# Run backend tests
cd server
make test

# Open Godot project
# Open Godot -> Import -> select client/project.godot
```

### Making Changes
1. **Backend**: Edit Go files, server auto-reloads (with air)
2. **Client**: Edit in Godot, press F5 to test
3. **Database**: Add migrations to `server/migrations/`

### Committing Code
- Write tests FIRST (TDD encouraged)
- Run tests before commit
- Write clear commit messages
- Reference phase in commit (e.g., "Phase 1: Add player movement")

---

## Architecture Diagrams

### System Overview
```
┌──────────────┐
│ Godot Client │ ◄──WebSocket (JSON)──► ┌────────────┐
│  (GDScript)  │                         │ Go Server  │
└──────────────┘                         │ (Port 7000)│
                                         └─────┬──────┘
                                               │
                                         ┌─────▼──────┐
                                         │ PostgreSQL │
                                         │ (Port 7001)│
                                         └────────────┘
```

### Server Architecture
```
Game Server
├── WebSocket Handler (network layer)
│   ├── Client connections
│   └── Message routing
├── Game Loop (60 TPS)
│   ├── Process inputs
│   ├── Update entities
│   ├── Physics/collision
│   └── Broadcast state
├── Game Systems
│   ├── Combat system
│   ├── Ability system
│   ├── Item system
│   ├── AI system
│   └── Progression system
└── Data Layer
    ├── Character manager
    ├── World manager
    └── Database queries
```

### Client Architecture
```
Godot Client
├── Scenes
│   ├── Main menu
│   ├── Lobby
│   ├── Game world
│   └── UI overlays
├── Autoload Singletons
│   ├── GameManager (state)
│   ├── NetworkManager (WebSocket)
│   └── AudioManager (sounds)
├── Game Systems
│   ├── Player controller
│   ├── Ability manager
│   ├── Inventory manager
│   └── VFX manager
└── Network Layer
    ├── Client prediction
    ├── Server reconciliation
    └── Entity interpolation
```

---

## Key Technologies & Libraries

### Backend (Go)
- `gorilla/websocket` - WebSocket server
- `lib/pq` - PostgreSQL driver
- `stretchr/testify` - Testing assertions
- Standard library for most game logic

### Client (Godot)
- Godot 4.3+ - Game engine
- GDScript - Scripting language
- Gut - Testing framework (addon)
- WebSocketPeer - Built-in networking

### Infrastructure
- Docker & Docker Compose - Containerization
- PostgreSQL 16 - Database
- (Optional) Redis - Session caching

---

## Performance Targets

- **Server**: 60 TPS stable with 100 players
- **Client**: 60+ FPS (90+ FPS for VR)
- **Latency**: <100ms for most players (depends on network)
- **Memory**: Server <500MB per world, Client <1GB

---

## Future Enhancements (Post-Phase 10)

- Skill trees and character classes
- Boss encounters with unique mechanics
- Crafting and item enhancement
- Trading between players
- Guilds/parties
- Leaderboards and seasons
- Mobile support (touch controls)
- Steam integration
- Dedicated server hosting tools
- Map editor for custom dungeons

---

**End of Implementation Plan**

Use this document to guide development. Each phase builds on the previous, and all systems are designed to work together. Testing is integrated throughout to ensure quality and stability.
