# Game Configuration Files

This directory contains all JSON-based configuration files for CS Crawler.

## Directory Structure

```
config/
├── shared/       # Configs used by BOTH client and server
├── client/       # Client-only visual/UI configs
└── server/       # Server-only gameplay configs
```

## Shared Configs (Client + Server)

### abilities.json
Defines all abilities in the game.

**Fields:**
- `name` - Display name
- `cooldown` - Seconds between uses
- `damage` - Base damage amount
- `damageType` - "fire", "cold", "lightning", "physical"
- `speed` - Projectile speed (if applicable)
- `lifetime` - Projectile lifetime (if applicable)
- `collisionRadius` - Hit detection radius

**Example:**
```json
"fireball": {
  "name": "Fireball",
  "cooldown": 0.5,
  "damage": 25.0,
  "damageType": "fire",
  "speed": 15.0
}
```

### enemies.json
Defines all enemy types.

**Fields:**
- `name` - Enemy name
- `health` / `maxHealth` - HP values
- `moveSpeed` - Movement speed
- `damage` - Attack damage
- `xpReward` - XP granted on death
- `visual` - Color, size, mesh type (client-only)
- `ai` - AI behavior type

**Example:**
```json
"basic": {
  "name": "Basic Enemy",
  "health": 100,
  "visual": {
    "color": [0.8, 0.2, 0.2],
    "height": 1.8
  }
}
```

### player.json
Defines player base stats.

**Fields:**
- `baseStats` - Starting health, speed, etc.
- `visual` - Player appearance
- `startingAbilities` - Abilities available at start

### combat.json
Defines combat mechanics.

**Fields:**
- `collisionRadii` - Hit detection radii by type
- `damageMultipliers` - Damage type vs damage type modifiers
- `statusEffects` - Status effect configurations

## Client Configs

### camera.json
Camera behavior and screen effects.

**Fields:**
- `camera.baseOffset` - Camera position relative to player
- `camera.deadzone` - Distance before camera follows
- `camera.followSpeed` - How fast camera catches up
- `screenShake` - Screen shake parameters

## Server Configs

### spawning.json
Enemy spawn patterns.

**Fields:**
- `spawnPatterns` - Named spawn configurations
  - `pattern` - "circle", "grid", etc.
  - `enemyType` / `enemyTypes` - What to spawn
  - `count` / `radius` / `spacing` - Pattern parameters

## Editing Configs

### Quick Edit
1. Edit JSON file
2. Validate: `cd scripts && go run validate_configs.go`
3. Restart server: `docker-compose restart gameserver`
4. Reload client: Press F5 in Godot

### Validation
Always run validation after editing:
```bash
cd cs-crawler-godot/scripts
go run validate_configs.go
```

Or compile once and run the binary:
```bash
cd cs-crawler-godot/scripts
go build validate_configs.go
./validate_configs  # Linux/Mac
validate_configs.exe  # Windows
```

## Common Tweaks

**Make fireballs faster:**
```json
// abilities.json
"fireball": {
  "speed": 20.0  // was 15.0
}
```

**Reduce cooldown:**
```json
"fireball": {
  "cooldown": 0.3  // was 0.5
}
```

**Add more starting enemies:**
```json
// spawning.json
"default": {
  "count": 10  // was 5
}
```

**Change enemy color:**
```json
// enemies.json
"basic": {
  "visual": {
    "color": [0.0, 1.0, 0.0]  // green instead of red
  }
}
```

## Version Field

All configs have a `version` field. Increment when making breaking changes:
```json
{
  "version": "1.1",  // was "1.0"
  ...
}
```

## Tips

- **JSON Syntax:** No trailing commas, use double quotes
- **Colors:** RGB arrays with values 0.0-1.0
- **Positions:** [X, Y, Z] arrays
- **Always Validate:** Run validation script before committing
- **Git Diff Friendly:** Keep formatting consistent

## Troubleshooting

**Server won't start:**
- Check JSON syntax (commas, quotes)
- Run validation script
- Check server logs

**Changes not applied:**
- Restart server: `docker-compose restart gameserver`
- Reload client: F5 in Godot
- Check console for config load errors

**Validation fails:**
- Fix reported JSON errors
- Ensure required fields present
- Check version field exists

## Documentation

See [CONFIG-SYSTEM-IMPLEMENTED.md](../CONFIG-SYSTEM-IMPLEMENTED.md) for full implementation details.
