# Level Generation Refactor - Implementation Plan

Maps from the current codebase to the target design in
[level-generation-refactor.md](./level-generation-refactor.md).

---

## Current State Summary

### Server (Go)
| File | What It Does | What Changes |
|------|-------------|--------------|
| `server/internal/game/level.go` | Random walk + room placement on flat 2D grid. Entire level generated at world creation. | **Replace entirely.** New hex tile generator with layer support. |
| `server/internal/game/world.go` | Single flat world instance. All entities in one container. Broadcasts full world_state at 60fps. | **Major refactor.** World becomes a layered hex grid. Entity tracking becomes per-tile. Broadcasts become proximity-scoped. |
| `server/internal/game/entity.go` | Player, Enemy, Projectile. Vector3 with Y always 0. | **Extend.** Y becomes meaningful (dungeon depth). Add `HexCoord` field to track which tile entities are in. Add `LightRadius` stat to Player. |
| `server/internal/game/enemy_ai.go` | State machine AI (idle, melee, ranged, charger, etc). | **Keep for now.** This stays as-is until Phase 4-5 (character AI split / LLM). |
| `server/internal/game/combat.go` | 2D distance checks, projectile collision, cone/line attacks. | **Minor changes.** Distance checks stay 2D (XZ plane). Add light-radius-based visibility checks for dungeons. |
| `server/internal/network/server.go` | WebSocket server. Broadcasts world_state to all clients in a world. 30s shutdown timer. | **Refactor broadcasts.** Change from "all entities to all clients" to "nearby entities to nearby clients" (tile-based scoping). |
| `server/internal/network/client.go` | Message handling. Sends full `level_data` on join. | **Refactor.** Replace single `level_data` with streaming `tile_data` messages. Add `tile_enter`/`tile_exit` events. |

### Client (Godot/GDScript)
| File | What It Does | What Changes |
|------|-------------|--------------|
| `client/scripts/level/level_manager.gd` | Loads full level from server JSON. Instantiates room scenes. Bakes one big navmesh. | **Replace entirely.** New hex tile manager that streams tiles in/out. Per-tile navmesh baking. |
| `client/scripts/level/room_*.gd` | 6 room type scripts (start, combat, corridor, treasure, boss, arena). | **Repurpose.** These become dungeon room types within hex tiles. Overworld tiles get new scripts. |
| `client/scenes/rooms/room_*.tscn` | Room prefab scenes. | **Repurpose for dungeons.** Add new hex tile scenes for overworld. |
| `client/scripts/game_world.gd` | 1628-line god object. Handles everything: entities, messages, camera, input, VFX. | **Incremental refactor.** Extract tile management. Update entity handling to be tile-aware. Camera stays mostly the same. |
| `client/scripts/player/player.gd` | Movement, input, ability casting, navmesh pathfinding. | **Extend.** Add light radius visual. Movement triggers tile streaming requests. |
| `client/scripts/ui/minimap.gd` | Shows room outlines and player dots. | **Rewrite.** Show hex grid with fog of war on unexplored tiles. |

### Shared Config
| File | What Changes |
|------|--------------|
| `config/shared/enemies.json` | **Extend.** Add per-biome enemy pools, dungeon-specific variants. |
| `config/shared/player.json` | **Extend.** Add `lightRadius` base stat. |
| New: `config/shared/biomes.json` | **Create.** Biome definitions with terrain types, enemy pools, lighting profiles, dungeon archetypes. |
| New: `config/shared/tiles.json` | **Create.** Hex tile generation parameters per biome. |

---

## Phase 1: Hex Grid Foundation

**Goal**: Replace the flat room-based level with a hex grid overworld. Player spawns in
town, can walk to adjacent hexes. One biome type (fields/grassland). No dungeons yet.

### 1a. Server: Hex Coordinate System
**New file**: `server/internal/game/hex.go`

```go
type HexCoord struct {
    Q     int  // axial q
    R     int  // axial r
    Layer int  // 0 = surface, -1 = depth 1, etc.
}
```

- Axial hex math: neighbors, distance, ring iteration, hex-to-world conversion
- World unit size per hex: ~20 units across (flat-top hex). This gives ~1 screen width at the current camera height of Y=20.
- Conversion: `HexToWorld(HexCoord) -> Vector3` (center of hex in world space)
- Ring enumeration: `HexRing(center, radius) -> []HexCoord`
- Neighbor lookup: 6 directions for layer 0

### 1b. Server: Tile Data Structure
**New file**: `server/internal/game/tile.go`

```go
type Tile struct {
    Coord       HexCoord
    Biome       string          // "grassland", "forest", etc.
    TileType    string          // "town", "overworld", "dungeon_entrance", "dungeon"
    Difficulty  int             // based on ring distance from town
    Generated   bool
    Terrain     *TerrainData    // heightmap, paths, features
    Spawns      []SpawnPoint    // enemy spawn locations
    Entities    map[string]bool // entity IDs currently in this tile
    Neighbors   [6]*HexCoord   // adjacent tile coords (nil if edge of world)
    EdgePaths   [6]bool        // which edges have paths connecting to neighbors
}

type TerrainData struct {
    Features    []TerrainFeature // trees, rocks, ruins, etc.
    PathNodes   []Vector3        // walkable path waypoints
    Boundary    HexBoundary      // world-space hex polygon vertices
}
```

### 1c. Server: Board Generator
**Modify**: `server/internal/game/level.go` → gut it, replace with board generation.

1. `GenerateBoard(seed, rings int) -> *Board`
   - Place town at `(0, 0, 0)`
   - Fill rings 1..N with overworld tiles
   - Assign difficulty = ring number
   - Assign biome (just "grassland" for Phase 1)
   - Mark 1 tile per ring as `dungeon_entrance` (placeholder, not functional yet)
2. `GenerateTile(coord HexCoord, board *Board) -> *Tile`
   - Called lazily when a player approaches an ungenerated tile
   - Creates terrain features, paths, spawn points
   - Ensures edge paths align with neighbors (check neighbor's EdgePaths if already generated)

### 1d. Server: World Refactor
**Modify**: `server/internal/game/world.go`

- World now holds a `Board` (the hex grid metadata) and a `map[HexCoord]*Tile` (generated tiles)
- `ActiveTiles` = set of tiles with players nearby (loaded + simulating)
- Entity tracking: each entity gets a `CurrentTile HexCoord` field
- `Update()` loop only processes entities in active tiles
- Tile activation: when a player enters a tile or is within 1 hex, activate that tile + neighbors
- Tile deactivation: when no players are within 2 hexes, deactivate (stop simulating, keep state)

### 1e. Server: Streaming Protocol
**Modify**: `server/internal/network/client.go`

Replace single `level_data` message with:

```json
// Server → Client: sent when player approaches a new tile
{
  "type": "tile_data",
  "coord": {"q": 1, "r": -1, "layer": 0},
  "biome": "grassland",
  "tileType": "overworld",
  "difficulty": 1,
  "terrain": { "features": [...], "paths": [...], "boundary": [...] },
  "spawns": [...],
  "edgePaths": [true, false, true, true, false, true],
  "lighting": { "ambientColor": [0.9, 0.85, 0.7], "ambientIntensity": 0.9, ... }
}

// Server → Client: sent when player leaves tile vicinity
{ "type": "tile_unload", "coord": {"q": 2, "r": -3, "layer": 0} }

// On join, send board_data (hex grid layout, no terrain details):
{
  "type": "board_data",
  "rings": 3,
  "tiles": [
    {"coord": {"q":0,"r":0,"layer":0}, "biome": "town", "tileType": "town", "explored": true},
    {"coord": {"q":1,"r":0,"layer":0}, "biome": "grassland", "tileType": "overworld", "explored": false},
    ...
  ]
}
```

### 1f. Server: Scoped Broadcasts
**Modify**: `server/internal/network/server.go`

- Current: `BroadcastToWorld()` sends all entities to all players
- New: `BroadcastToNearby()` sends entities within active tiles to each player
- Each player gets a `world_state` containing only entities in their tile + adjacent tiles
- This is critical for performance with many tiles and split parties

### 1g. Client: Hex Tile Manager
**Rewrite**: `client/scripts/level/level_manager.gd`

- Receives `tile_data` messages, instantiates tile scenes
- Maintains `loaded_tiles: Dictionary` keyed by `Vector3i(q, r, layer)`
- Hex tile scene: ground mesh (hex polygon), terrain features, edge path connections
- Per-tile navmesh baking (small, fast)
- Fade-in animation when new tiles appear
- Remove tile scene on `tile_unload`

### 1h. Client: Hex Tile Scene
**New scene**: `client/scenes/tiles/hex_tile_overworld.tscn`

- Hex-shaped ground mesh (flat-top hexagon, ~20 units across)
- Grass/terrain material
- Slots for terrain features (trees, rocks placed by server data)
- Edge path meshes connecting to neighbor hexes
- Subtle hex border (low stone wall, hedgerow, or path edge)
- Per-tile OmniLight or DirectionalLight contribution

### 1i. Client: Town Tile
**New scene**: `client/scenes/tiles/hex_tile_town.tscn`

- Safe zone at world center
- Placeholder NPCs (static meshes for now)
- Distinct visual feel: warm lighting, market stalls, campfire
- No enemy spawns

### 1j. Client: Minimap Rewrite
**Modify**: `client/scripts/ui/minimap.gd`

- Draw hex grid instead of room rectangles
- Color by biome type
- Fog of war: unexplored tiles are dark/hidden
- Player dot(s) on current tile
- Dungeon entrance markers (for later)

### 1k. Client: Game World Updates
**Modify**: `client/scripts/game_world.gd`

- Handle `board_data` message (store hex grid layout)
- Handle `tile_data` / `tile_unload` messages (delegate to tile manager)
- Entity management becomes tile-aware: entities reference their tile
- Camera system stays the same (follows player, high 3rd person)

### 1l. Config
**New file**: `config/shared/biomes.json`
```json
{
  "grassland": {
    "lighting": {
      "ambientColor": [0.9, 0.85, 0.7],
      "ambientIntensity": 0.9,
      "fogEnabled": false
    },
    "enemyPool": ["basic", "fast", "zombie"],
    "terrainFeatures": ["tree_oak", "rock_small", "bush", "flower_patch"],
    "groundColor": [0.4, 0.6, 0.3]
  }
}
```

### Tests
- `hex_test.go`: Coordinate math, neighbor lookup, ring iteration, hex-to-world conversion
- `tile_test.go`: Tile generation, edge path alignment between neighbors
- `board_test.go`: Board generation, difficulty assignment, dungeon entrance placement
- `world_test.go`: Tile activation/deactivation, scoped broadcasts
- Client: Gut tests for tile loading/unloading

---

## Phase 2: Dungeon Layer

**Goal**: Dungeon entrances on overworld tiles lead to underground hex tiles. Player walks
down a ramp/staircase and arrives in a dungeon tile on layer -1. Reuse existing room
generation logic (random walk) adapted to fit within hex tiles.

### 2a. Server: Dungeon Generation
**New file**: `server/internal/game/dungeon.go`

- `GenerateDungeon(entranceCoord HexCoord, biome string, difficulty int) -> []*Tile`
- Generates 3-8 dungeon tiles on layer -1 beneath the entrance hex and possibly neighboring hexes
- Each dungeon tile contains rooms generated by the existing random walk algorithm (adapted from current `level.go`)
- Room types reused: combat, corridor, treasure, boss
- First dungeon tile has entrance room connecting to the overworld ramp
- Last dungeon tile has boss room
- Dungeon tiles connect to each other via tunnels at hex edges

### 2b. Server: Vertical Transitions
- Entrance tile has a `DungeonEntrance` field: world-space position + target `HexCoord` on layer -1
- Dungeon entry tile has a `DungeonExit` field: world-space position + target `HexCoord` on layer 0
- When player's position is within range of entrance, server transitions them:
  - Update player's `CurrentTile` to the dungeon tile
  - Player Y position shifts downward (e.g., Y = -15 for layer -1)
  - Send `tile_data` for dungeon tiles, `tile_unload` for distant overworld tiles

### 2c. Client: Vertical Geometry
- Dungeon entrance on overworld tile: visible cave mouth / staircase going down
- Dungeon tiles rendered at Y offset (layer * -15.0 units)
- Camera smoothly follows player down the ramp
- Overworld tiles remain visible above (ceiling mesh on dungeon tiles with occasional holes for light shafts)

### 2d. Client: Dungeon Tile Scenes
**Repurpose existing room scenes** into dungeon tile content:
- `room_combat.tscn` → combat areas within dungeon hex tiles
- `room_boss.tscn` → boss room within final dungeon tile
- `room_corridor.tscn` → connecting passages
- Wrap in new `hex_tile_dungeon.tscn` container with:
  - Hex-shaped floor (stone/cave material)
  - Wall meshes around hex edges (except where tunnels connect)
  - Ceiling mesh (optional, with holes)
  - Very low ambient light

### 2e. Server: Dungeon Entity Management
- Enemies in dungeon tiles only activate when a player is on that layer
- Overworld above stays active independently
- Entities cannot cross layers except through entrance/exit points

### Tests
- `dungeon_test.go`: Generation produces valid connected dungeon, entrance/exit links work
- Client: Test dungeon tile loading, vertical camera transition

---

## Phase 3: Lighting System

**Goal**: Overworld is bright and vibrant. Dungeons are dark. Players have a light radius
stat that determines visibility in dungeons.

### 3a. Server: Light Radius Stat
**Modify**: `server/internal/game/entity.go`

- Add `LightRadius float64` to Player struct (base value from config, modified by items)
- Add `lightRadius` to `config/shared/player.json` (default: 8.0 units)
- Items can have `lightRadius` affix (add to `config/shared/items.json`)

### 3b. Server: Visibility Filtering
**Modify**: `server/internal/game/world.go` broadcast logic

- In dungeons (layer < 0), only include enemies in `world_state` that are within the player's light radius + a small buffer
- Enemies outside light radius are not sent to the client at all (server-authoritative fog of war)
- This prevents cheating (can't just hack the client to see in the dark)
- Overworld: no filtering, full visibility within tile + neighbors

### 3c. Client: Light Radius Rendering
**Modify**: `client/scripts/player/player.gd`

- Attach OmniLight3D to player character
- Light range = `lightRadius` stat from server
- Light energy and color configurable
- In dungeons: this is the primary light source. World ambient is near-zero.
- In overworld: light is barely visible (ambient is already bright)

### 3d. Client: Dungeon Atmosphere
**Modify**: `client/scripts/game_world.gd` (WorldEnvironment)

- When player enters a dungeon tile, transition WorldEnvironment:
  - Ambient light → near zero
  - Fog → enabled, dense, dark color
  - Tonemap → darker exposure
- When player exits to overworld, transition back
- Smooth interpolation over ~1 second

### 3e. Client: Environmental Lights in Dungeons
- Server sends `lightSources` array in dungeon `tile_data`
- Client places OmniLight3D at each position (braziers, glowing fungi, lava pools)
- These create pockets of visibility that the player can navigate between
- Visual meshes at light source positions (brazier model, glowing mushroom, etc.)

### 3f. Config: Biome Lighting Profiles
**Extend**: `config/shared/biomes.json`

Add dungeon archetype lighting:
```json
{
  "grassland": {
    "lighting": { "ambientIntensity": 0.9 },
    "dungeonArchetypes": {
      "cave": {
        "lighting": { "ambientIntensity": 0.05, "fogDensity": 0.03 },
        "lightSources": { "density": 0.3, "types": ["brazier", "mushroom"] }
      }
    }
  }
}
```

### Tests
- Server: Visibility filtering returns correct enemies based on light radius
- Server: Light radius stat is modified by equipment
- Client: Light transitions between overworld and dungeon

---

## Phase 4: Player/Character Split

**Goal**: Player controls movement and build. Character AI handles combat. Start with
behavior trees, prepare the interface for LLM replacement later.

### 4a. Server: Character AI Interface
**New file**: `server/internal/game/character_ai.go`

```go
type CharacterAI interface {
    Decide(state *CombatState) *CombatAction
}

type CombatState struct {
    Self        EntitySnapshot    // HP, position, abilities, cooldowns
    Enemies     []EntitySnapshot  // visible enemies (filtered by light radius)
    Allies      []EntitySnapshot  // nearby friendly players/minions
    Terrain     *TileSnapshot     // nearby terrain features
    Personality *Personality      // aggression, caution, trust level
}

type CombatAction struct {
    Action    string  // "attack", "dodge", "use_ability", "retreat", "idle"
    Target    string  // entity ID
    Direction Vector3
    AbilityID string
    Mood      string  // "confident", "frustrated", "scared", etc.
    Dialogue  string  // optional bark: "I need better gear for this!"
}
```

### 4b. Server: Behavior Tree Implementation
**New file**: `server/internal/game/character_ai_bt.go`

- Implement `CharacterAI` interface using behavior trees
- Reuse logic from existing `enemy_ai.go` patterns (state machine → behavior tree)
- Decision tree:
  1. If health < 20% → retreat / use potion
  2. If enemies in melee range → dodge or counter-attack
  3. If ability off cooldown → use highest-priority ability on best target
  4. Else → position for next engagement
- Personality modifiers adjust thresholds (aggressive: retreat at 10%, cautious: retreat at 40%)

### 4c. Server: Input Split
**Modify**: `server/internal/network/client.go`

- Player still sends `move` messages (movement control stays with player)
- Remove `use_ability` from player input (character AI now decides when to cast)
- Add `set_priority` message: player can hint targeting priority
- Add `set_stance` message: player sets aggressive/defensive/balanced
- Character AI runs each tick for each player, produces `CombatAction`
- Server executes the action (create projectile, apply damage, etc.)

### 4d. Client: Input Changes
**Modify**: `client/scripts/player/player.gd`

- Remove ability casting on keypress (1-4 keys)
- Keep movement (WASD, click-to-move)
- Add stance toggle UI (aggressive/defensive/balanced)
- Add priority targeting UI (click enemy to mark as priority target)
- Display character's mood/dialogue as floating text

### 4e. Server: Trust System
**Modify**: `server/internal/game/entity.go` (Player struct)

```go
type CharacterPersonality struct {
    Aggression  float64 // 0.0 = cautious, 1.0 = reckless
    Trust       float64 // 0.0 = distrustful, 1.0 = full trust
    Mood        string  // current emotional state
}
```

- Trust increases when player's movement leads to successful combat outcomes
- Trust decreases when player runs into obviously dangerous situations repeatedly
- Low trust → character hesitates, delays actions, picks safer options
- Very low trust → character may refuse to enter a room, vocalize complaints

### 4f. Client: Character Feedback
- Floating dialogue bubbles above character when mood changes
- Animation changes: confident character stands tall, scared character hunches
- UI indicator showing current trust level and mood

### Tests
- `character_ai_test.go`: Behavior tree produces valid actions for various combat states
- `trust_test.go`: Trust changes correctly based on outcomes
- Integration: Player moves, character fights autonomously, combat works end-to-end

---

## Phase 5: Embedded LLM Integration

**Goal**: Replace behavior tree with LLM-based decision making. Character AI produces
richer, more varied responses with personality and tactical reasoning.

### 5a. Server: LLM Runtime Integration
**New file**: `server/internal/ai/llm.go`

- Integrate llama.cpp via CGo bindings (or NVIGI SDK if NVIDIA-only)
- Single model instance, loaded at server startup
- Async inference goroutine with request channel
- Model: Nemotron-4 4B Q4 (primary) or Llama 3.2 3B Q4 (fallback)

### 5b. Server: State Serializer
**New file**: `server/internal/ai/serializer.go`

- `SerializeCombatState(state *CombatState) -> string` (compact prompt, ~200 tokens)
- Includes: character stats, visible enemies (filtered by light radius), available abilities,
  personality traits, recent events, current mood
- Template-based: fill in structured fields, not free-form prose

### 5c. Server: Grammar Definition
**New file**: `server/internal/ai/grammar.gbnf`

- GBNF grammar constraining output to valid `CombatAction` JSON
- Enumerate valid action types, target formats, mood strings
- Keeps generation to ~10-20 tokens with most being deterministic structure

### 5d. Server: LLM Character AI
**New file**: `server/internal/game/character_ai_llm.go`

- Implements `CharacterAI` interface
- Sends `CombatState` to serializer → prompt → LLM inference channel
- Receives `CombatAction` JSON → parse → return
- Async: returns last action while waiting for new inference result
- Falls back to behavior tree if inference takes too long (>200ms) or fails

### 5e. Server: Light Radius → Perception
- State serializer only includes enemies within light radius
- Low light = character "sees" fewer enemies = model makes decisions with incomplete info
- This naturally produces worse decisions in the dark without any artificial nerf

### 5f. Server: Batching & Scheduling
- Request queue batches multiple characters' prompts
- Process 2-4 characters per game tick cycle
- Priority: characters actively in combat get evaluated more frequently
- Idle characters get evaluated every 1-2 seconds

### 5g. Fine-Tuning Pipeline (Separate Effort)
- Record gameplay sessions as training data
- Format: (combat state JSON, expert action JSON) pairs
- Fine-tune base model using Unsloth
- Evaluate on held-out combat scenarios
- Ship fine-tuned GGUF alongside game

### Tests
- `llm_test.go`: Model loads, grammar constrains output correctly, inference returns valid JSON
- `serializer_test.go`: State serialization produces correct prompt format
- `character_ai_llm_test.go`: LLM decisions are valid actions, fallback works when inference is slow
- Integration: Full combat loop with LLM decisions

---

## Phase 6: Multiplayer Streaming & Polish

**Goal**: Optimize for multiple players in different tiles/layers. Add biome variety.
VR optimizations.

### 6a. Server: Optimized Tile Streaming
- Track each player's "tile viewport" (their tile + 1-ring neighbors on their layer)
- Delta updates: only send new tile data when viewport changes
- Tile generation queue: prioritize tiles players are moving toward
- Background generation: pre-generate tiles 2 rings ahead of any player

### 6b. Server: Multi-Layer Entity Management
- Separate entity update loops per active layer
- Entities on inactive layers are frozen (no CPU cost)
- Cross-layer events: sound/vibration signals between layers (future)

### 6c. Server: Biome Variety
**Extend**: `config/shared/biomes.json`

Add biomes: forest, swamp, hills, ruins, coastline
- Each with unique: enemy pools, terrain features, lighting, dungeon archetypes
- Biome assignment: noise-based clustering during board generation
- Natural transitions: forest→swamp, hills→mountains

### 6d. Client: Biome Visuals
- Per-biome ground materials and colors
- Per-biome terrain feature sets (different tree models, rock types, etc.)
- Per-biome ambient audio (birds for forest, bubbling for swamp, wind for hills)

### 6e. Client: VR Optimizations
- Detect VR mode, request server use smaller model (1.7B)
- Reduce tile visual detail (fewer terrain features, simpler meshes)
- Ensure async inference never impacts frame timing
- Test at 90fps with stereo rendering + inference running

### 6f. Polish
- Tile fade-in/fade-out animations
- Hex border visual variations per biome
- Weather effects on overworld tiles
- Dungeon ambient audio (drips, echoes, distant rumbling)
- Death/respawn flow: character returns to town tile

### Tests
- Load test: 4 players in different tiles on different layers
- Performance test: tile generation time, broadcast size, frame budget
- VR test: maintain 90fps with inference running

---

## Dependency Graph

```
Phase 1 (Hex Grid)
    |
    ├──> Phase 2 (Dungeons) ──> Phase 3 (Lighting)
    |                                |
    |                                v
    |                          Phase 4 (Character AI Split)
    |                                |
    |                                v
    |                          Phase 5 (LLM Integration)
    |
    └──> Phase 6 (Multiplayer & Polish) -- can start after Phase 2,
                                           runs parallel to Phases 3-5
```

Phase 1 is the foundation everything depends on. Phase 6 can be incrementally worked on
alongside later phases since it's mostly optimization and content.

---

## Files to Create (New)

| File | Phase | Purpose |
|------|-------|---------|
| `server/internal/game/hex.go` | 1 | Hex coordinate math |
| `server/internal/game/hex_test.go` | 1 | Hex math tests |
| `server/internal/game/tile.go` | 1 | Tile data structure and generation |
| `server/internal/game/tile_test.go` | 1 | Tile generation tests |
| `server/internal/game/board.go` | 1 | Board (hex grid) generation |
| `server/internal/game/board_test.go` | 1 | Board generation tests |
| `server/internal/game/dungeon.go` | 2 | Dungeon generation |
| `server/internal/game/dungeon_test.go` | 2 | Dungeon tests |
| `server/internal/game/character_ai.go` | 4 | AI interface + types |
| `server/internal/game/character_ai_bt.go` | 4 | Behavior tree implementation |
| `server/internal/game/character_ai_bt_test.go` | 4 | BT tests |
| `server/internal/game/character_ai_llm.go` | 5 | LLM implementation |
| `server/internal/ai/llm.go` | 5 | LLM runtime wrapper |
| `server/internal/ai/serializer.go` | 5 | Combat state → prompt |
| `server/internal/ai/grammar.gbnf` | 5 | Output grammar |
| `config/shared/biomes.json` | 1 | Biome definitions |
| `config/shared/tiles.json` | 1 | Tile generation params |
| `client/scenes/tiles/hex_tile_overworld.tscn` | 1 | Overworld hex tile |
| `client/scenes/tiles/hex_tile_town.tscn` | 1 | Town hex tile |
| `client/scenes/tiles/hex_tile_dungeon.tscn` | 2 | Dungeon hex tile |
| `client/scripts/level/hex_tile_manager.gd` | 1 | Client tile streaming |
| `client/scripts/level/hex_tile_overworld.gd` | 1 | Overworld tile script |
| `client/scripts/level/hex_tile_town.gd` | 1 | Town tile script |
| `client/scripts/level/hex_tile_dungeon.gd` | 2 | Dungeon tile script |

## Files to Heavily Modify

| File | Phase | Nature of Change |
|------|-------|-----------------|
| `server/internal/game/level.go` | 1 | Gut and replace with board generation |
| `server/internal/game/world.go` | 1 | Tile-based entity tracking, scoped broadcasts |
| `server/internal/game/entity.go` | 1,3 | Add HexCoord, LightRadius |
| `server/internal/network/server.go` | 1 | Proximity-scoped broadcasts |
| `server/internal/network/client.go` | 1,4 | Streaming tile protocol, input split |
| `client/scripts/level/level_manager.gd` | 1 | Rewrite as hex tile manager |
| `client/scripts/game_world.gd` | 1,3 | Tile-aware entity management, lighting transitions |
| `client/scripts/player/player.gd` | 3,4 | Light radius visual, remove ability input |
| `client/scripts/ui/minimap.gd` | 1 | Hex grid with fog of war |
| `config/shared/player.json` | 3 | Add lightRadius stat |
| `config/shared/items.json` | 3 | Add lightRadius affix |

## Files to Keep As-Is (For Now)

| File | Reason |
|------|--------|
| `server/internal/game/enemy_ai.go` | Enemy AI stays. Character AI is separate (Phase 4). |
| `server/internal/game/combat.go` | Combat math stays. Minor light radius check added in Phase 3. |
| `server/internal/game/ability.go` | Ability system stays. Triggered by character AI instead of player input in Phase 4. |
| `server/internal/game/inventory.go` | Inventory stays. Player still manages items directly. |
| `server/internal/game/item.go` | Item system stays. Extended with lightRadius affix in Phase 3. |
| `server/internal/database/database.go` | DB stays. Extended with new fields as needed. |
| `client/scripts/ui/ability_bar.gd` | Stays but becomes display-only (shows what character is doing, not player input). |
| `client/scripts/ui/inventory_panel.gd` | Stays as-is. Player still manages inventory. |
