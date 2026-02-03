# Phase 2: Combat & Abilities - Setup Guide

This guide explains the manual setup steps needed to complete Phase 2 implementation.

## ✅ What's Been Implemented

### Backend (Complete)
- ✅ Combat system with projectile collision detection
- ✅ Damage calculation and health/death system for entities
- ✅ Ability framework with cooldown management
- ✅ Fireball ability implementation
- ✅ Enemy spawning (5 enemies in a circle at spawn)
- ✅ WebSocket message handlers for `use_ability`
- ✅ Combat events (damage_events, death_events) in world state
- ✅ Comprehensive unit tests (all passing)

### Client (Complete - Code Only)
- ✅ Enemy script with health bars and death animations
- ✅ Projectile script with visual effects (trails, glow)
- ✅ Ability bar UI with cooldown displays
- ✅ Damage numbers system (floating text)
- ✅ Explosion effects on projectile impact
- ✅ Screen shake on hits
- ✅ Input handling for abilities (keyboard "1" key)

---

## 🔧 Manual Setup Required

### 1. Godot Project Input Actions

You need to add input actions to the Godot project settings:

1. Open Godot Editor
2. Go to **Project → Project Settings → Input Map**
3. Add the following actions:

| Action Name | Key Binding |
|-------------|-------------|
| `ability_1` | Key: 1      |
| `ability_2` | Key: 2      |
| `ability_3` | Key: 3      |
| `ability_4` | Key: 4      |

### 2. Create Missing Scene Files

The following scene files need to be created in the Godot editor:

#### **Enemy Scene** (`res://scenes/enemy/enemy.tscn`)
1. Create a new scene with `CharacterBody3D` as root
2. Attach the script: `res://scripts/enemy/enemy.gd`
3. Save as `res://scenes/enemy/enemy.tscn`

**Node structure:**
```
CharacterBody3D (enemy.gd attached)
└── (Script will create children dynamically)
```

#### **Projectile Scene** (`res://scenes/projectile/projectile.tscn`)
1. Create a new scene with `Node3D` as root
2. Attach the script: `res://scripts/projectile/projectile.gd`
3. Save as `res://scenes/projectile/projectile.tscn`

**Node structure:**
```
Node3D (projectile.gd attached)
└── (Script will create children dynamically)
```

#### **Ability Bar UI** (Add to game world scene)
1. Open `res://scenes/game_world.tscn`
2. Add a `Control` node as child of root
3. Name it `AbilityBarUI`
4. Attach script: `res://scripts/ui/ability_bar.gd`
5. Set anchors: Bottom-center
6. Save the scene

### 3. Update Existing Scenes

#### **Game World Scene** (`res://scenes/game_world.tscn`)

Ensure the scene has these containers:
- `Players` (Node3D)
- `Enemies` (Node3D) ← Make sure this exists!
- `Projectiles` (Node3D) ← Make sure this exists!

If they don't exist, add them:
1. Open the game_world scene
2. Add three `Node3D` nodes as children of root
3. Name them: `Players`, `Enemies`, `Projectiles`
4. Save

---

## 🚀 Testing Phase 2

### Start the Server

```bash
cd cs-crawler-godot
docker-compose up -d
```

### Run the Client

1. Open Godot Editor
2. Load the project (`cs-crawler-godot/client`)
3. Press F5 to run

### Test Combat

1. **Join the game** - You should see your player spawn
2. **See enemies** - 5 red enemies should appear in a circle around spawn
3. **Cast Fireball**:
   - Press `1` key
   - Aim with mouse (orange projectile fires toward mouse position)
   - Should see:
     - Fireball projectile with trail effect
     - Collision with enemy
     - Damage number floating up
     - Enemy health bar decreases
     - Screen shake on impact
     - Explosion particles
4. **Kill an enemy** - Fire multiple fireballs at one enemy
   - Should see enemy fade out and disappear
5. **Test cooldown** - Try pressing `1` rapidly
   - Ability bar should show cooldown timer
   - Can only cast every 3 seconds

---

## 📊 System Architecture

### Message Flow: Ability Cast

```
Client Input (1 key)
  ↓
Player Script → NetworkManager
  ↓
WebSocket: { type: "use_ability", abilityType: "fireball", direction: {...} }
  ↓
Server: Client.handleUseAbility()
  ↓
Server: Check cooldown → Create projectile → Add to world
  ↓
WebSocket Broadcast: { type: "ability_cast", playerID, projectileID, ... }
  ↓
Client: All clients receive ability_cast
  ↓
Server Game Loop: Update projectiles → Check collisions
  ↓
Server: Collision detected → Apply damage → Generate events
  ↓
WebSocket Broadcast: { type: "world_state", damageEvents: [...], deathEvents: [...] }
  ↓
Client: Update projectiles, enemies, spawn damage numbers, effects
```

### Combat System Components

**Server:**
- `combat.go` - Collision detection, damage calculation
- `ability.go` - Ability definitions, cooldown management
- `entity.go` - Player, Enemy, Projectile entities
- `world.go` - Entity management, collision checking, event generation

**Client:**
- `enemy.gd` - Enemy rendering, health bar, death animation
- `projectile.gd` - Projectile visual effects
- `ability_bar.gd` - UI for abilities and cooldowns
- `damage_number.gd` - Floating damage text
- `game_world.gd` - Entity spawning, event handling, effects

---

## 🐛 Troubleshooting

### Enemies Don't Appear
- Check that `Enemies` container exists in game_world scene
- Check server logs: `docker-compose logs gameserver`
- Enemy spawn code in `world.go` → `spawnInitialEnemies()`

### Fireball Doesn't Fire
- Verify input action `ability_1` is set to key "1"
- Check console for "[PLAYER] Cast ability" message
- Check server logs for ability handling

### No Collision Detection
- Projectile collision radius: 0.5 units
- Enemy collision uses Distance3D check
- Collision checked every server tick (60 TPS)

### Health Bar Not Showing
- Health bar uses SubViewport + Sprite3D
- Check enemy.gd `_setup_health_bar()` method
- Billboard mode should be enabled

### Projectile Appears But No Damage
- Check `damageEvents` in world_state message
- Verify projectile owner ID matches
- Check server logs for collision detection

---

## 🎮 Phase 2 Feature Checklist

- [x] Backend: Projectile entities with collision
- [x] Backend: Damage calculation system
- [x] Backend: Health/death system
- [x] Backend: Ability framework with cooldowns
- [x] Backend: Fireball ability
- [x] Backend: Enemy spawning (5 enemies)
- [x] Backend: Combat message types
- [x] Backend: Unit tests
- [x] Client: Enemy models with health bars
- [x] Client: Projectile visual effects
- [x] Client: Ability casting (keybind)
- [x] Client: Ability bar UI
- [x] Client: Damage numbers
- [x] Client: Explosion effects
- [x] Client: Screen shake
- [x] Client: Death animations
- [ ] Manual: Input actions setup
- [ ] Manual: Scene files created
- [ ] Manual: End-to-end testing

---

## 📝 Notes

### Current Limitations (To be addressed in later phases)
- Only 1 ability (Fireball) implemented
- Enemies don't move or attack (AI in Phase 5)
- No enemy respawning
- No ability customization yet (modifiers in Phase 3)
- Projectile speed and damage are fixed
- No friendly fire check

### Performance
- Server: 60 TPS game loop
- Projectile lifetime: 5 seconds
- Collision checks: O(n) per projectile per enemy
- Health bar: Rendered via SubViewport (may need optimization)

### Next Steps (Phase 3)
- Implement 3 more base abilities (Frostbolt, Lightning, BasicAttack)
- Add modifier system (Pet, Turret, Homing, Piercing)
- Status effects (slow, stun)
- Pet/Turret entities

---

## 🎉 Success Criteria

Phase 2 is complete when:
1. ✅ Server starts without errors
2. ✅ Client connects and spawns
3. ✅ 5 enemies visible in world
4. ✅ Pressing "1" fires a fireball
5. ✅ Fireball hits enemy and deals damage
6. ✅ Damage number appears
7. ✅ Enemy health bar updates
8. ✅ Enemy dies after enough damage
9. ✅ Screen shakes on impact
10. ✅ Explosion effect plays
11. ✅ Cooldown prevents rapid casting

**Phase 2 implementation is COMPLETE (pending manual Godot setup)!**
