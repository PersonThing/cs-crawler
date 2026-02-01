# Configuration System Migration Plan

## Goal
Move hardcoded configuration values from code (Go/GDScript) into shared JSON files that both client and server can load. This enables:
- ✅ Single source of truth for game balance
- ✅ Easy tweaking without code changes
- ✅ Data-driven design
- ✅ Potential hot-reloading
- ✅ Modding support

---

## Current State Analysis

### Hardcoded Values by System

#### 1. **Abilities** ⚠️ HIGH PRIORITY (duplicated across client/server)

**Server** (`ability.go`):
```go
Cooldown:   0.5,
Damage:     25.0,
DamageType: DamageTypeFire,
Range:      30.0,
Speed:      15.0,
Lifetime:   5.0,
Radius:     0.5,
```

**Client** (`ability_bar.gd`, `player.gd`):
```gdscript
"cooldown": 0.5,  # DUPLICATED - can desync!
```

**Impact**: High - Affects gameplay balance, currently duplicated

---

#### 2. **Enemies** ⚠️ MEDIUM PRIORITY

**Server** (`entity.go`, `world.go`):
```go
Health:     100,
MaxHealth:  100,
// Spawn: 5 enemies in circle at radius 10
```

**Client** (`enemy.gd`):
```gdscript
current_health: float = 100.0
max_health: float = 100.0
# Visual: Red capsule, 1.8 units tall
```

**Impact**: Medium - Stats duplicated, visuals client-only

---

#### 3. **Player** ⚠️ MEDIUM PRIORITY

**Server** (`entity.go`):
```go
Health:     100,
MaxHealth:  100,
MoveSpeed:  5.0,
```

**Client** (`player.gd`):
```gdscript
move_speed: float = 5.0  # DUPLICATED
```

**Impact**: Medium - Movement speed duplicated

---

#### 4. **Combat** ⚠️ MEDIUM PRIORITY

**Server** (`combat.go`, `ability.go`):
```go
Radius:     0.5,  // Collision radius
// Damage calculation formulas
```

**Impact**: Medium - Affects hit detection

---

#### 5. **Camera/UI** ✅ LOW PRIORITY (client-only)

**Client** (`game_world.gd`):
```gdscript
camera_base_offset: Vector3 = Vector3(0, 20, 7.3)
camera_deadzone: float = 3.0
camera_follow_speed: float = 4.0
screen_shake_decay: float = 5.0
```

**Impact**: Low - Client-only, no sync issues

---

## Proposed Configuration Structure

```
cs-crawler-godot/
├── config/
│   ├── shared/                    # Configs used by BOTH client and server
│   │   ├── abilities.json         # Ability definitions
│   │   ├── enemies.json           # Enemy type definitions
│   │   ├── player.json            # Player base stats
│   │   ├── combat.json            # Combat mechanics
│   │   └── damage_types.json      # Damage type definitions
│   │
│   ├── client/                    # Client-only configs
│   │   ├── camera.json            # Camera behavior
│   │   ├── ui.json                # UI layout and styling
│   │   ├── visuals.json           # Visual effects settings
│   │   └── keybinds.json          # Default keybindings
│   │
│   └── server/                    # Server-only configs
│       ├── spawning.json          # Enemy spawn patterns
│       ├── world.json             # World settings
│       └── balance.json           # Server-side balance overrides
```

---

## Phase 1: Ability Configuration System ⭐ START HERE

### 1.1 Create Shared Config File

**File**: `config/shared/abilities.json`

```json
{
  "version": "1.0",
  "abilities": {
    "fireball": {
      "name": "Fireball",
      "type": "projectile",
      "cooldown": 0.5,
      "damage": 25.0,
      "damageType": "fire",
      "range": 30.0,
      "speed": 15.0,
      "lifetime": 5.0,
      "collisionRadius": 0.5,
      "manaCost": 0,
      "description": "Launches a ball of fire"
    },
    "frostbolt": {
      "name": "Frostbolt",
      "type": "projectile",
      "cooldown": 0.8,
      "damage": 20.0,
      "damageType": "cold",
      "range": 30.0,
      "speed": 12.0,
      "lifetime": 5.0,
      "collisionRadius": 0.5,
      "manaCost": 0,
      "statusEffect": {
        "type": "slow",
        "duration": 2.0,
        "magnitude": 0.5
      },
      "description": "Launches a frozen bolt that slows enemies"
    }
  }
}
```

### 1.2 Server Implementation (Go)

**New file**: `server/internal/config/abilities.go`

```go
package config

import (
    "encoding/json"
    "os"
)

type AbilityConfig struct {
    Name            string  `json:"name"`
    Type            string  `json:"type"`
    Cooldown        float64 `json:"cooldown"`
    Damage          float64 `json:"damage"`
    DamageType      string  `json:"damageType"`
    Range           float64 `json:"range"`
    Speed           float64 `json:"speed"`
    Lifetime        float64 `json:"lifetime"`
    CollisionRadius float64 `json:"collisionRadius"`
    ManaCost        float64 `json:"manaCost"`
    Description     string  `json:"description"`
}

type AbilitiesData struct {
    Version   string                    `json:"version"`
    Abilities map[string]AbilityConfig  `json:"abilities"`
}

var abilities AbilitiesData

func LoadAbilities(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return err
    }
    return json.Unmarshal(data, &abilities)
}

func GetAbilityConfig(abilityType string) (*AbilityConfig, bool) {
    config, ok := abilities.Abilities[abilityType]
    return &config, ok
}
```

**Modified**: `server/internal/game/ability.go`

```go
// Change from hardcoded to config-driven
func GetFireballAbility() *Ability {
    config, ok := config.GetAbilityConfig("fireball")
    if !ok {
        // Fallback to default if config missing
        log.Warn("Fireball config not found, using defaults")
        return getDefaultFireball()
    }

    return &Ability{
        Type:       AbilityFireball,
        Name:       config.Name,
        Cooldown:   config.Cooldown,
        Damage:     config.Damage,
        DamageType: parseDamageType(config.DamageType),
        Range:      config.Range,
        Speed:      config.Speed,
        Lifetime:   config.Lifetime,
        Radius:     config.CollisionRadius,
    }
}
```

**Modified**: `server/cmd/gameserver/main.go`

```go
func main() {
    // Load configs at startup
    if err := config.LoadAbilities("../../config/shared/abilities.json"); err != nil {
        log.Fatalf("Failed to load abilities config: %v", err)
    }

    // ... rest of initialization
}
```

### 1.3 Client Implementation (Godot)

**New file**: `client/scripts/config/config_loader.gd`

```gdscript
extends Node
## Global config loader singleton

var abilities: Dictionary = {}
var enemies: Dictionary = {}
var player_config: Dictionary = {}

func _ready() -> void:
    _load_abilities()

func _load_abilities() -> void:
    var file_path = "res://../../config/shared/abilities.json"

    # Try to load from config directory
    if not FileAccess.file_exists(file_path):
        push_error("Abilities config not found at: " + file_path)
        _use_default_abilities()
        return

    var file = FileAccess.open(file_path, FileAccess.READ)
    if not file:
        push_error("Failed to open abilities config")
        _use_default_abilities()
        return

    var json = JSON.new()
    var parse_result = json.parse(file.get_as_text())
    file.close()

    if parse_result != OK:
        push_error("Failed to parse abilities JSON")
        _use_default_abilities()
        return

    var data = json.get_data()
    abilities = data.get("abilities", {})
    print("[CONFIG] Loaded ", abilities.size(), " abilities")

func _use_default_abilities() -> void:
    # Fallback defaults
    abilities = {
        "fireball": {
            "name": "Fireball",
            "cooldown": 0.5,
            "damage": 25.0
        }
    }

func get_ability(ability_type: String) -> Dictionary:
    return abilities.get(ability_type, {})
```

**Modified**: `client/scripts/player/player.gd`

```gdscript
# At top of file
var config_loader = null

func _ready() -> void:
    # Get config loader singleton
    config_loader = get_node("/root/ConfigLoader")

    # Load ability cooldowns from config
    _load_ability_configs()
    # ... rest of ready

func _load_ability_configs() -> void:
    var fireball_config = config_loader.get_ability("fireball")
    if fireball_config.has("cooldown"):
        ability_cooldown_times["fireball"] = fireball_config["cooldown"]
```

**Modified**: `client/scripts/ui/ability_bar.gd`

```gdscript
func _ready() -> void:
    var config_loader = get_node("/root/ConfigLoader")

    # Load ability data from config
    var fireball = config_loader.get_ability("fireball")
    abilities["fireball"] = {
        "name": fireball.get("name", "Fireball"),
        "cooldown": fireball.get("cooldown", 0.5),
        "icon": null,
        "keybind": "1"
    }

    _setup_ability_buttons()
    # ... rest
```

### 1.4 Testing & Validation

**Create**: `config/shared/config.schema.json` (JSON Schema for validation)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "version": { "type": "string" },
    "abilities": {
      "type": "object",
      "patternProperties": {
        "^[a-z_]+$": {
          "type": "object",
          "required": ["name", "cooldown", "damage", "damageType"],
          "properties": {
            "name": { "type": "string" },
            "cooldown": { "type": "number", "minimum": 0 },
            "damage": { "type": "number", "minimum": 0 },
            "damageType": { "enum": ["fire", "cold", "lightning", "physical"] }
          }
        }
      }
    }
  }
}
```

**Validation Script**: `scripts/validate_configs.py`

```python
import json
import jsonschema

def validate_config(config_file, schema_file):
    with open(config_file) as f:
        config = json.load(f)
    with open(schema_file) as f:
        schema = json.load(f)

    jsonschema.validate(config, schema)
    print(f"✅ {config_file} is valid")

validate_config("config/shared/abilities.json", "config/shared/config.schema.json")
```

---

## Phase 2: Enemy Configuration

### 2.1 Create Config

**File**: `config/shared/enemies.json`

```json
{
  "version": "1.0",
  "enemyTypes": {
    "basic": {
      "name": "Basic Enemy",
      "health": 100,
      "maxHealth": 100,
      "moveSpeed": 0,
      "damage": 10,
      "xpReward": 5,
      "visual": {
        "meshType": "capsule",
        "color": [0.8, 0.2, 0.2],
        "scale": [1.0, 1.0, 1.0],
        "height": 1.8,
        "radius": 0.4
      },
      "ai": {
        "type": "idle",
        "aggroRange": 0
      }
    },
    "fast": {
      "name": "Fast Enemy",
      "health": 50,
      "maxHealth": 50,
      "moveSpeed": 8.0,
      "damage": 5,
      "xpReward": 8,
      "visual": {
        "meshType": "capsule",
        "color": [0.2, 0.8, 0.2],
        "scale": [0.7, 1.0, 0.7],
        "height": 1.5,
        "radius": 0.3
      }
    }
  }
}
```

### 2.2 Server Implementation

- Load enemy configs at startup
- `NewEnemy()` looks up config by type
- Apply stats from config

### 2.3 Client Implementation

- Load enemy visuals from config
- `_setup_appearance()` uses config values
- Color, size from JSON

---

## Phase 3: Player Configuration

**File**: `config/shared/player.json`

```json
{
  "version": "1.0",
  "baseStats": {
    "health": 100,
    "maxHealth": 100,
    "moveSpeed": 5.0,
    "mana": 100,
    "maxMana": 100,
    "manaRegen": 5.0
  },
  "visual": {
    "meshType": "capsule",
    "color": [0.3, 0.3, 0.8],
    "height": 1.8,
    "radius": 0.4
  }
}
```

---

## Phase 4: Combat Configuration

**File**: `config/shared/combat.json`

```json
{
  "version": "1.0",
  "collisionRadii": {
    "projectile": 0.5,
    "melee": 1.5,
    "aoe": 5.0
  },
  "damageMultipliers": {
    "fire": {
      "vs_cold": 1.5,
      "vs_fire": 0.5
    }
  },
  "statusEffects": {
    "slow": {
      "maxStacks": 1,
      "defaultDuration": 2.0
    }
  }
}
```

---

## Phase 5: Client-Specific Configs

**File**: `config/client/camera.json`

```json
{
  "version": "1.0",
  "camera": {
    "baseOffset": [0, 20, 7.3],
    "deadzone": 3.0,
    "followSpeed": 4.0,
    "angle": 70,
    "fov": 70
  },
  "screenShake": {
    "amount": 0.1,
    "decay": 5.0
  }
}
```

---

## Implementation Strategy

### Order of Implementation
1. ✅ **Phase 1: Abilities** (highest priority - currently duplicated)
2. ✅ **Phase 2: Enemies** (shared stats, client visuals)
3. ✅ **Phase 3: Player** (shared stats)
4. ✅ **Phase 4: Combat** (formulas, multipliers)
5. ✅ **Phase 5: Client configs** (camera, UI - low priority)

### Migration Approach
- **Incremental**: Migrate one system at a time
- **Backward Compatible**: Keep fallbacks to hardcoded values
- **Tested**: Validate each config file
- **Documented**: Comment each config field

---

## Benefits & Trade-offs

### Benefits ✅
- Single source of truth for balance
- Easy iteration and balancing
- No recompilation for tweaks
- Modding support foundation
- Better testing (can load different configs)
- Git-friendly (separate balance from code)

### Trade-offs ⚠️
- Added complexity (file I/O, parsing)
- Runtime errors from malformed JSON
- Need validation tooling
- Slightly slower startup (file loading)
- Type safety lost (JSON is dynamic)

### Mitigations
- JSON schema validation
- Fallback to defaults on error
- Config version checking
- Comprehensive error messages
- Automated config testing

---

## Next Steps

1. **Create config directory structure**
   ```bash
   mkdir -p config/shared config/client config/server
   ```

2. **Implement Phase 1 (Abilities)**
   - Create `abilities.json`
   - Add Go config loader
   - Add Godot ConfigLoader autoload
   - Update ability system to use configs
   - Test with modified values

3. **Validate & Document**
   - Create JSON schemas
   - Add validation script
   - Document config format in README

4. **Iterate**
   - Monitor for issues
   - Get feedback
   - Continue to Phase 2

---

## File Locations Summary

```
cs-crawler-godot/
├── config/
│   ├── shared/
│   │   ├── abilities.json         ← Phase 1
│   │   ├── enemies.json           ← Phase 2
│   │   ├── player.json            ← Phase 3
│   │   └── combat.json            ← Phase 4
│   └── client/
│       └── camera.json            ← Phase 5
├── server/
│   └── internal/
│       └── config/
│           └── loader.go          ← New config package
└── client/
    └── scripts/
        └── config/
            └── config_loader.gd   ← New autoload singleton
```

---

## Questions to Consider

1. **Hot Reloading**: Should configs be reloadable without restart?
2. **Validation**: JSON Schema, custom validation, or both?
3. **Environments**: Dev vs Production configs?
4. **Defaults**: Embed defaults in code as fallback?
5. **Versioning**: How to handle config format changes?

---

**Status**: 📋 **PLANNED** - Ready for implementation

**Estimated Effort**:
- Phase 1: 2-3 hours
- Phases 2-5: 4-6 hours total
- Testing & Polish: 2 hours

**Total**: ~10 hours for complete system
