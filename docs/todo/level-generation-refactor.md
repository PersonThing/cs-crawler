# Level Generation Refactor - Design Plan

## Overview

Refactor the level generation system into a layered, procedural hex-based world with seamless
transitions, dungeon depth layers, a player/character separation model, and an embedded LLM
for character AI decision-making.

---

## 1. World Structure: Layered Hex Grid

### 1.1 Hex Grid Coordinate System
- Implement axial hex coordinates `(q, r)` with a vertical layer dimension: `(q, r, layer)`
- Layer 0 = overworld surface
- Layer -1, -2, ... = dungeon depths
- Each hex tile is approximately 1 screen wide
- Difficulty scales with distance from town (ring-based: ring 1 = easy, outer rings = harder)

### 1.2 Tile Types
- **Town (Safe Zone)**: Center tile at `(0, 0, 0)`. No enemies. NPCs, vendors, stash, quest board. Grows/changes with player progression.
- **Overworld Tiles**: Fields, forests, rivers, hills, coastlines, ruins. Full ambient lighting, vibrant colors, long sight lines.
- **Dungeon Entrances**: Overworld tiles with a cave/crypt/temple entrance that leads to layer -1 beneath.
- **Dungeon Tiles**: Underground rooms and corridors. Dark, claustrophobic, require light radius.

### 1.3 Board Generation Algorithm
1. Place Town at center `(0, 0, 0)`
2. Generate difficulty gradient radiating outward by ring
3. Assign biomes using wave function collapse or noise maps - clusters of similar terrain with natural transitions (forest→swamp, hills→mountains)
4. Place dungeon entrances at key points - minimum one per ring, themed to biome
5. Place points of interest on overworld tiles - shrines, camps, mini-events

---

## 2. Seamless Streaming & Multiplayer

### 2.1 Tile Streaming
- Server generates hex tiles on demand as any player approaches
- Each tile is a self-contained generation unit with defined edge connection points (paths, rivers, terrain heights must match neighbors)
- Server holds authoritative world state
- Clients load/unload tiles based on proximity to their character

### 2.2 Multiplayer Tile Loading
- Players can split up across different tiles
- Each player's client loads tiles in their vicinity independently
- Overlapping tiles are shared (no duplication on server)
- Server tracks active tile set = union of all player vicinities

### 2.3 Session Persistence
- World state is generated and persisted for the duration of the game session
- Sessions persist while any player is connected
- Garbage collect world state a few minutes after the last player disconnects

---

## 3. Seamless Vertical Transitions (Dungeons)

### 3.1 Physical Layering
- Dungeon entrances are literal downward paths in the geometry (cave mouths, stairways, holes)
- Camera follows character down seamlessly - no loading screens, no cuts
- Overworld remains active above; other players can be on the surface directly above a dungeon party

### 3.2 Dungeon Generation
1. Select dungeon archetype based on biome + difficulty (e.g., forest + mid-difficulty = "overgrown temple")
2. Generate room graph: BSP, random walk, or grammar-based
3. Assign room types: combat, puzzle, trap, treasure, boss, rest
4. Place enemies, loot, environmental storytelling
5. Set light profile: base ambient level, light source placement, darkness density
6. Dungeons can span multiple hexes underground - enter in one hex, exit in another

### 3.3 Future Cross-Layer Mechanics
- Collapsing floors between layers
- Sound/vibration traveling between layers
- Calling for help from above/below
- Digging mechanics

---

## 4. Lighting System

### 4.1 Overworld Lighting
- Full ambient lighting (0.8 - 1.0)
- Saturated, warm color palettes
- Weather effects, time of day
- Enemies visible from a distance

### 4.2 Dungeon Lighting
- Near-zero ambient lighting (0.0 - 0.2)
- Desaturated, cold color palettes
- Light radius stat is core mechanic:
  - Low light radius: enemies emerge from darkness with almost no reaction time
  - High light radius: see threats early, plan engagements
- Environmental light sources: braziers, lava, bioluminescent fungi (tactical anchor points)
- Darkness events: sounds, movement at edge of radius, enemies that flee/are drawn to light

### 4.3 Light Radius as AI Input
- Light radius directly affects what information the character AI receives
- Low light = smaller state snapshot passed to the LLM = worse decisions (organic difficulty scaling)
- High light = character AI sees more threats, makes better tactical choices

### 4.4 Zone Feel Profiles

| Parameter        | Bright Outdoor      | Dark Dungeon           |
|------------------|---------------------|------------------------|
| Ambient light    | 0.8 - 1.0          | 0.0 - 0.2             |
| Color palette    | Saturated, warm     | Desaturated, cold      |
| Music            | Adventurous, open   | Tense, minimal         |
| Sound design     | Birds, wind, life   | Drips, echoes, silence |
| Enemy behavior   | Patrol, visible     | Ambush, lurking        |
| Camera           | Pulled back, wide   | Tight, close           |

---

## 5. Player/Character Separation ("Director Mode")

### 5.1 Player Controls (Strategic Layer)
- Movement / pathfinding direction
- Build configuration: spells, abilities, item loadout, skill allocation
- Strategic decisions: which dungeon to enter, when to retreat
- Priority targeting hints: "focus casters," "avoid that thing"

### 5.2 Character Controls (Tactical Layer - AI-Driven)
- Combat execution: attack timing, ability usage, dodging
- Reactive decisions: block, parry, kite, use potions
- Contextual awareness: "I'm not going in there" / "I need better gear"
- Personality-influenced decision style (aggressive rushes in, cautious kites)

### 5.3 Trust/Disagreement System
- Character tracks trust in the player's decisions
- Good strategy builds trust → character performs better, complies more readily
- Repeated bad decisions erode trust → character gets hesitant, makes worse decisions, may refuse
- Pushback manifests through dialogue, animation, and mechanical reluctance

---

## 6. Embedded LLM for Character AI

### 6.0 Target Hardware Profile
- **GPU**: NVIDIA GeForce RTX 4070 Ti (Ada Lovelace, 12 GB VRAM, CUDA 12.7)
- **Idle desktop VRAM usage**: ~4 GB (OS, Chrome, VS Code, etc.)
- **Estimated VRAM available while gaming**: 5-7 GB after Godot renderer
- **Architecture advantages**: Ada Lovelace supports NVIGI SDK, TensorRT-LLM, and CIG scheduling

### 6.1 Model Selection (Recommended for RTX 4070 Ti)
- **Primary recommendation**: Nemotron-4 4B, INT4 quantized (~2 GB VRAM)
  - Purpose-built for in-game character AI on GeForce cards
  - Already shipping in real games (Mecha BREAK, inZOI)
  - Optimized for NVIGI SDK with Compute-in-Graphics scheduling
- **Strong alternative**: Llama 3.2 3B, INT4 quantized (~1.5-2 GB VRAM)
  - Better community/ecosystem support, more fine-tuning resources
  - Works with llama.cpp if NVIDIA-agnostic runtime is preferred
- **VR mode fallback**: Qwen3-1.7B, INT4 quantized (~1 GB VRAM)
  - For when stereo rendering at 90fps leaves less GPU headroom
  - Still capable enough for grammar-constrained action selection
- **Expected inference speed on 4070 Ti**:
  - 3B model: ~100-150 tok/s → grammar-constrained decisions in 30-50ms
  - 1.7B model: ~150-250 tok/s → grammar-constrained decisions in 20-35ms
- **VRAM budget**: 1-2 GB model weights + ~0.2 GB KV cache (short 256-512 token context)
  - Leaves 9-10 GB for rendering + OS, comfortable margin even in VR

### 6.2 Runtime
- **Primary (NVIDIA path)**: NVIGI SDK
  - Compute-in-Graphics (CIG) scheduling shares GPU between rendering and inference
  - Purpose-built for the "inference alongside game renderer" problem on GeForce
  - Supports TensorRT backend for optimized inference on Ada Lovelace
  - Requires NVIDIA driver 555.85+ (current: 566.36, compatible)
- **Fallback (cross-platform)**: llama.cpp
  - C/C++, CUDA/Vulkan/Metal/CPU, native grammar constraints
  - Godot-compatible, wider hardware support for other players' machines
  - Vulkan backend performs within ~3% of CUDA

### 6.3 Architecture
```
[Game State Snapshot]
        |
        v
[State Serializer] --> compact prompt (~200 tokens)
        |               (character HP, nearby enemies, abilities available,
        |                personality, recent events, light-radius-filtered perception)
        v
[Shared LLM Instance] <-- single model, batched requests from all characters
        |                  async thread, never blocks render
        |                  grammar-constrained output (GBNF / XGrammar)
        v
[Action JSON]          {"action": "dodge_roll", "direction": "left",
        |               "then": "counter_attack", "target": "nearest",
        |               "mood": "frustrated", "reason": "sent into danger again"}
        v
[Action Parser] --> feeds traditional game AI (animation state machine, pathfinding)
        |
        v
[Character Behavior + Dialogue/Animation from mood/reason fields]
```

### 6.4 Performance Targets
- Grammar-constrained output: ~3-5 real model forward passes per decision
- Target: 20-50ms per decision with grammar constraints + speculative decoding
- Decision frequency: 2-4 decisions per second per character
- Batching: cycle through characters, evaluate 2-4 per frame at 60fps
- Fallback: behavior trees / utility AI if inference is slow or unavailable

### 6.5 Fine-Tuning
- Fine-tune on game-specific action space, character archetypes, combat scenarios
- Tools: Unsloth or similar for efficient small model fine-tuning
- Training data: recorded gameplay sessions, hand-authored combat decision examples

---

## 7. Camera System

### 7.1 Desktop
- High third-person view, loosely following the controlled character
- Fixed perspective (may add rotation/tilt later based on playtesting)

### 7.2 VR
- Same high third-person base position
- Free head look (natural VR head tracking)
- Hovering above a living diorama - tabletop aesthetic comes from the sense of scale

### 7.3 Tabletop Aesthetic (Both Platforms)
- World has a slightly miniature/diorama quality
- Subtle hex boundaries as natural terrain features (paths, hedgerows, stone borders)
- Tile reveal: new tiles generate/fade in as player approaches (satisfying discovery)
- Visible randomness for loot/encounter rolls (dice, cards, spinners on the board)

---

## 8. Implementation Phases

### Phase 1: Hex Grid Foundation
- [ ] Implement axial hex coordinate system with layer support
- [ ] Town tile (safe zone) generation
- [ ] Basic overworld tile generation (1 biome type)
- [ ] Tile edge matching (paths/terrain connect between neighbors)
- [ ] Streaming: generate tiles on approach, unload on distance

### Phase 2: Dungeon Layer
- [ ] Dungeon entrance placement on overworld tiles
- [ ] Dungeon room graph generation (BSP or random walk)
- [ ] Seamless vertical transition (camera follows character down)
- [ ] Basic dungeon tile types: combat room, corridor, boss room

### Phase 3: Lighting System
- [ ] Overworld ambient lighting with zone feel profiles
- [ ] Dungeon darkness with light radius mechanic
- [ ] Environmental light sources in dungeons
- [ ] Light radius stat integration

### Phase 4: Player/Character Split
- [ ] Separate player input (movement/strategy) from character action (combat)
- [ ] Basic character AI using behavior trees (pre-LLM)
- [ ] Trust/disagreement tracking
- [ ] Character dialogue/animation for pushback

### Phase 5: Embedded LLM Integration
- [ ] Integrate llama.cpp (or chosen runtime) into the game server
- [ ] Define action JSON schema and GBNF grammar
- [ ] State serializer: game state → compact prompt
- [ ] Async inference pipeline with batching
- [ ] Replace behavior tree combat decisions with LLM output
- [ ] Light radius → perception filtering in state serializer
- [ ] Fine-tune model on game-specific data

### Phase 6: Multiplayer & Polish
- [ ] Multi-player tile streaming (split party support)
- [ ] Session persistence and garbage collection
- [ ] Biome variety (multiple overworld biome types)
- [ ] Wave function collapse or noise-based biome assignment
- [ ] VR-specific optimizations (model size, async guarantees, 90fps budget)

---

## Open Questions
- Exact hex tile size in world units
- How many rings per board / act
- Whether desktop camera should allow rotation
- Character autonomy scope: optional toggle between full-auto and semi-auto combat?
- Determinism strategy for LLM decisions (temperature tuning, seed control)
- Scaling strategy when 20+ characters need decisions simultaneously
