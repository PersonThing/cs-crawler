# CS Crawler Godot - Phased Implementation Plan

This document outlines the complete implementation plan for rebuilding CS Crawler in Godot with a Go backend. Each phase is self-contained and can be referenced with "implement phase N" in future prompts.

---

## Phase 1: Core Infrastructure & Movement

**Goal**: Establish basic client-server architecture with player movement and camera control.

### Backend Tasks
1. **Server Setup**
   - Initialize Go project structure
   - Set up WebSocket server on port 7000
   - Implement basic game loop (60 TPS)
   - Create Player entity with position/velocity
   - Implement server-authoritative movement
   - **Tests**:
     - Unit test: Player entity creation and updates
     - Integration test: WebSocket connection handling
     - Integration test: Movement input processing

2. **Message Protocol**
   - Define JSON message types:
     - `join` - Player joins world
     - `move` - Player movement input
     - `world_state` - Server broadcasts state
   - Implement message serialization/deserialization
   - **Tests**:
     - Unit test: Message marshaling/unmarshaling
     - Integration test: Full message round-trip

3. **Database Setup**
   - Create PostgreSQL schema for player accounts
   - Implement player account creation/login (basic)
   - Character storage (name, stats)
   - **Tests**:
     - Integration test: Database connection
     - Integration test: CRUD operations for accounts

### Client Tasks
1. **Godot Project Setup**
   - Configure project settings (rendering, physics)
   - Set up autoload singletons (GameManager, NetworkManager)
   - Create main menu scene
   - **Tests**:
     - Unit test: GameManager state transitions
     - Unit test: NetworkManager connection logic

2. **Player Movement**
   - Create player scene with low-poly capsule model
   - Implement WASD movement with client prediction
   - Add basic animation state machine (idle, walk, run)
   - **Tests**:
     - Unit test: Input handling
     - Integration test: Movement synchronization with server

3. **Camera System**
   - Fixed top-down camera with angle (60-70° from vertical)
   - Follow player smoothly (lerp-based)
   - Configure frustum for optimal view
   - **Tests**:
     - Unit test: Camera follow logic
     - Manual test: Visual validation of camera behavior

4. **Server Synchronization**
   - Implement client prediction for movement
   - Server reconciliation (apply corrections smoothly)
   - Interpolation for other players
   - **Tests**:
     - Integration test: Client-server position sync
     - Integration test: Multiple client connections

### Deliverables
- ✅ Players can connect to server
- ✅ Players can move with WASD
- ✅ Camera follows player
- ✅ Multiple players visible in same world
- ✅ Movement feels responsive (client prediction working)

**Estimated Complexity**: Medium (foundational work)

---

## Phase 2: Basic Combat & Abilities

**Goal**: Implement the first ability (Fireball) with full combat pipeline.

### Backend Tasks
1. **Combat System**
   - Create Projectile entity
   - Implement damage calculation
   - Add collision detection (projectile vs enemies)
   - Health/death system for entities
   - **Tests**:
     - Unit test: Damage calculation
     - Unit test: Projectile lifecycle
     - Integration test: Projectile collision with enemies

2. **Ability Framework**
   - Define ability data structure (cooldown, damage, type)
   - Implement ability usage validation (cooldown check)
   - Broadcast ability casts to clients
   - **Tests**:
     - Unit test: Cooldown management
     - Unit test: Ability validation
     - Integration test: Ability usage flow

3. **Enemy System**
   - Create basic Enemy entity
   - Spawn enemies in world
   - Basic AI: idle state
   - Health and death handling
   - **Tests**:
     - Unit test: Enemy creation
     - Unit test: Enemy death and removal
     - Integration test: Enemy spawning

### Client Tasks
1. **Ability System**
   - Create Fireball ability scene (projectile + VFX)
   - Implement ability bar UI (slots 1-4)
   - Keybind handling (1 key = cast fireball)
   - Client-side ability prediction (instant feedback)
   - **Tests**:
     - Unit test: Ability cooldown UI
     - Unit test: Keybind mapping
     - Integration test: Ability casting with server

2. **Visual Effects**
   - Particle system for fireball projectile (trail)
   - Explosion effect on impact (GPUParticles3D)
   - Screen shake on impact
   - **Tests**:
     - Manual test: Visual quality check

3. **Enemy Rendering**
   - Create basic enemy model (procedural low-poly)
   - Health bar above enemy
   - Death animation (fade out / particle burst)
   - **Tests**:
     - Unit test: Health bar updates
     - Manual test: Visual validation

4. **Damage Numbers**
   - Floating damage numbers on hit
   - Color-coded by damage type
   - **Tests**:
     - Manual test: Visual validation

### Deliverables
- ✅ Players can cast Fireball ability
- ✅ Projectiles travel and collide with enemies
- ✅ Enemies take damage and die
- ✅ Visual feedback for all combat actions
- ✅ Cooldown system working

**Estimated Complexity**: Medium-High (combat is complex)

---

## Phase 3: Advanced Abilities & Modifiers

**Goal**: Implement 3 more base abilities and the modifier system.

### Backend Tasks
1. **More Abilities**
   - Implement Frostbolt (projectile + slow effect)
   - Implement Lightning (line-based instant damage)
   - Implement BasicAttack (cone melee)
   - Add status effects system (slow, stun)
   - **Tests**:
     - Unit test: Each ability's damage calculation
     - Unit test: Status effect application/removal
     - Integration test: Multiple abilities in combat

2. **Modifier System**
   - Define modifier data structure
   - Implement Pet modifier (spawns entity that casts ability)
   - Implement Turret modifier (stationary caster)
   - Implement Homing modifier (projectile tracking)
   - Implement Piercing modifier (pass through enemies)
   - **Tests**:
     - Unit test: Modifier application to abilities
     - Unit test: Pet/Turret AI and lifecycle
     - Integration test: Modified abilities in combat

3. **Minion System (Pets & Turrets)**
   - Create Pet entity (follows owner, casts abilities)
   - Create Turret entity (stationary, casts abilities)
   - Implement ownership and targeting
   - Lifetime management (despawn after duration)
   - **Tests**:
     - Unit test: Pet follow behavior
     - Unit test: Turret targeting
     - Integration test: Minion spawning and despawning

### Client Tasks
1. **Ability VFX**
   - Frostbolt: ice particles, blue color
   - Lightning: beam effect (line renderer or mesh)
   - BasicAttack: cone visualization (debug optional)
   - **Tests**:
     - Manual test: Visual quality

2. **Modifier UI**
   - Ability customization panel
   - Drag-and-drop modifiers onto abilities
   - Display active modifiers on ability icons
   - **Tests**:
     - Unit test: Modifier assignment logic
     - Manual test: UI usability

3. **Pet & Turret Rendering**
   - Pet models (small versions of player/creatures)
   - Pet follow animation
   - Turret models (stationary objects)
   - **Tests**:
     - Manual test: Visual validation

### Deliverables
- ✅ 4 base abilities functional (Fireball, Frostbolt, Lightning, BasicAttack)
- ✅ Modifier system working (Pet, Turret, Homing, Piercing)
- ✅ Players can customize abilities with modifiers
- ✅ Pets and turrets spawn and attack

**Estimated Complexity**: High (many new systems)

---

## Phase 4: Item System & Inventory

**Goal**: Implement random item generation, inventory, and stat system.

### Backend Tasks
1. **Item Data Model**
   - Define item structure (type, quality, attributes, abilities)
   - Implement item generation algorithm
   - Create item templates (weapons, armor, etc.)
   - **Tests**:
     - Unit test: Item generation
     - Unit test: Item attribute randomization

2. **Inventory System**
   - Create inventory structure (equipped + bags)
   - Implement equip/unequip logic
   - Handle 1h/2h weapon restrictions
   - Ground items (dropped loot)
   - **Tests**:
     - Unit test: Inventory slot management
     - Unit test: Equip validation
     - Integration test: Item pickup and drop

3. **Stat Calculation**
   - Aggregate stats from equipped items
   - Apply stats to player (damage, health, speed, etc.)
   - Set bonuses (track set pieces)
   - **Tests**:
     - Unit test: Stat aggregation
     - Unit test: Set bonus calculation

### Client Tasks
1. **Inventory UI**
   - Character equipment panel (head, chest, hands, feet, weapons)
   - Bag grid (60 slots)
   - Item tooltips (stats, description)
   - Drag-and-drop functionality
   - **Tests**:
     - Unit test: Drag-and-drop logic
     - Manual test: UI usability

2. **Item Rendering**
   - 3D models for item types (sword, helmet, etc.)
   - Attach equipped items to player skeleton
   - Ground item visualization (spinning, glowing)
   - **Tests**:
     - Manual test: Visual validation

3. **Item VFX**
   - Rarity-based glow (normal, rare, unique)
   - Particle effects for special items
   - **Tests**:
     - Manual test: Visual quality

### Deliverables
- ✅ Items generate with random stats
- ✅ Inventory system functional
- ✅ Items affect player stats
- ✅ Items drop from enemies and can be picked up
- ✅ Set bonuses working

**Estimated Complexity**: High (complex system with many interactions)

---

## Phase 5: Enemy AI & Behaviors

**Goal**: Implement diverse enemy types with interesting behaviors and synergies.

### Backend Tasks
1. **AI Framework**
   - State machine for enemy AI (idle, chase, attack, flee)
   - Pathfinding integration (A* or nav mesh)
   - Target selection (closest player, lowest health, etc.)
   - **Tests**:
     - Unit test: State transitions
     - Unit test: Target selection logic
     - Integration test: Pathfinding

2. **Enemy Types**
   - Implement 5-10 unique enemy types:
     - Melee (zombie, skeleton)
     - Ranged (archer, mage)
     - Support (shaman - buffs allies, necromancer - summons)
     - Special (exploder, charger)
   - Define stats per type (health, damage, speed)
   - **Tests**:
     - Unit test: Each enemy type's behavior
     - Integration test: Enemy variety in world

3. **Enemy Synergies**
   - Pack behaviors (group buffs, coordinated attacks)
   - Resurrection mechanic (necromancer)
   - Rage mode (when grouped or low health)
   - **Tests**:
     - Unit test: Pack detection
     - Unit test: Buff application
     - Integration test: Synergy behaviors

### Client Tasks
1. **Enemy Models**
   - Procedurally generate low-poly models with skeletons
   - Different body types (humanoid, spider, ghost, etc.)
   - Animation state machines (idle, walk, attack, death)
   - **Tests**:
     - Manual test: Visual quality and variety

2. **Enemy VFX**
   - Attack effects per enemy type
   - Status indicators (buffed, enraged, slowed)
   - Death effects
   - **Tests**:
     - Manual test: Visual clarity

3. **AI Debugging Tools**
   - Toggle to show enemy state (debug overlay)
   - Pathfinding visualization
   - **Tests**:
     - Manual test: Debug tools work

### Deliverables
- ✅ Multiple enemy types with distinct behaviors
- ✅ Enemies use abilities and work together
- ✅ AI feels challenging but fair
- ✅ Visual variety in enemies

**Estimated Complexity**: High (AI is complex)

---

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
