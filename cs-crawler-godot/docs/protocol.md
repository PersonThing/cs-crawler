# Network Protocol Documentation

This document defines the WebSocket message protocol between the Godot client and Go server.

## Overview

- **Transport**: WebSocket
- **Format**: JSON (will migrate to Protobuf later)
- **Port**: 7000 (default)
- **Endpoint**: `ws://localhost:7000/ws`

## Connection Flow

```
Client                          Server
  |                               |
  |--- WebSocket Connect -------->|
  |<-- Connection Accepted -------|
  |                               |
  |--- join message ------------->|
  |<-- joined response -----------|
  |                               |
  |<-- world_state (loop) --------|
  |--- player inputs ------------>|
  |                               |
```

## Message Types

All messages are JSON objects with a `type` field.

### Client → Server

#### 1. Join Game

**Message:**
```json
{
  "type": "join",
  "username": "Player1",
  "worldID": "game-123",
  "characterID": "char-456" // optional
}
```

**Purpose**: Player requests to join a game world.

**Fields:**
- `username` (string) - Display name
- `worldID` (string) - World to join (or "default")
- `characterID` (string, optional) - Existing character to use

**Server Response:**
```json
{
  "type": "joined",
  "playerID": "p-abc123",
  "worldID": "game-123",
  "position": {"x": 0, "y": 0, "z": 0},
  "stats": {...}
}
```

---

#### 2. Move

**Message:**
```json
{
  "type": "move",
  "velocity": {
    "x": 1.0,
    "y": 0.0,
    "z": 0.5
  },
  "timestamp": 1234567890
}
```

**Purpose**: Update player movement direction.

**Fields:**
- `velocity` (Vector3) - Movement direction (normalized)
- `timestamp` (int) - Client timestamp for reconciliation

**Server Response:** None (movement is reflected in world_state)

---

#### 3. Use Ability

**Message:**
```json
{
  "type": "use_ability",
  "abilityID": "fireball",
  "target": {
    "x": 10.5,
    "y": 0.0,
    "z": 5.0
  },
  "modifiers": ["pet", "homing"],
  "timestamp": 1234567890
}
```

**Purpose**: Cast an ability.

**Fields:**
- `abilityID` (string) - ID of ability to cast
- `target` (Vector3) - Target position or direction
- `modifiers` ([]string) - Active modifiers for this cast
- `timestamp` (int) - Client timestamp

**Server Response:**
```json
{
  "type": "ability_cast",
  "playerID": "p-abc123",
  "abilityID": "fireball",
  "success": true,
  "cooldownUntil": 1234567890
}
```

---

#### 4. Inventory Action

**Message:**
```json
{
  "type": "inventory_action",
  "action": "equip", // or "drop", "use", "swap"
  "itemID": "item-123",
  "slot": "head", // optional, for equip
  "targetSlot": "bag_5" // optional, for swap
}
```

**Purpose**: Interact with inventory.

**Fields:**
- `action` (string) - equip, drop, use, swap
- `itemID` (string) - Item to interact with
- `slot` (string, optional) - Target equipment slot
- `targetSlot` (string, optional) - For swapping items

**Server Response:**
```json
{
  "type": "inventory_updated",
  "equipped": {...},
  "bags": [...],
  "stats": {...}
}
```

---

#### 5. Chat Message

**Message:**
```json
{
  "type": "chat",
  "message": "Hello world!",
  "channel": "world" // or "whisper", "party"
}
```

**Purpose**: Send chat message.

**Server Response:** Broadcast to all players in channel

---

### Server → Client

#### 1. Joined Confirmation

**Message:**
```json
{
  "type": "joined",
  "playerID": "p-abc123",
  "worldID": "game-123",
  "position": {"x": 0, "y": 0, "z": 0},
  "stats": {
    "health": 100,
    "maxHealth": 100,
    "moveSpeed": 5.0,
    ...
  },
  "inventory": {...},
  "abilities": [...]
}
```

**Purpose**: Confirm player joined and send initial state.

---

#### 2. World State (Broadcast)

**Message:**
```json
{
  "type": "world_state",
  "timestamp": 1234567890,
  "players": [
    {
      "id": "p-abc123",
      "username": "Player1",
      "position": {"x": 10, "y": 0, "z": 5},
      "velocity": {"x": 1, "y": 0, "z": 0},
      "health": 85,
      "maxHealth": 100
    }
  ],
  "enemies": [
    {
      "id": "e-xyz789",
      "type": "burning_zombie",
      "position": {"x": 20, "y": 0, "z": 10},
      "health": 50
    }
  ],
  "projectiles": [
    {
      "id": "proj-123",
      "position": {"x": 15, "y": 1, "z": 7},
      "velocity": {"x": 10, "y": 0, "z": 5}
    }
  ],
  "groundItems": [
    {
      "id": "item-456",
      "position": {"x": 12, "y": 0, "z": 8},
      "itemType": "sword"
    }
  ]
}
```

**Purpose**: Broadcast current world state to all clients.

**Frequency**: Every server tick (60 TPS)

---

#### 3. Ability Cast

**Message:**
```json
{
  "type": "ability_cast",
  "playerID": "p-abc123",
  "abilityID": "fireball",
  "target": {"x": 10, "y": 0, "z": 5},
  "success": true,
  "cooldownUntil": 1234567890
}
```

**Purpose**: Notify clients of ability usage (for VFX).

---

#### 4. Damage Event

**Message:**
```json
{
  "type": "damage_event",
  "targetID": "e-xyz789",
  "sourceID": "p-abc123",
  "damage": 50,
  "damageType": "fire",
  "isCrit": false,
  "isDead": false
}
```

**Purpose**: Visual feedback for damage numbers.

---

#### 5. Entity Died

**Message:**
```json
{
  "type": "entity_died",
  "entityID": "e-xyz789",
  "killerID": "p-abc123",
  "lootDrops": ["item-789", "item-790"]
}
```

**Purpose**: Trigger death animations and loot.

---

#### 6. Inventory Updated

**Message:**
```json
{
  "type": "inventory_updated",
  "equipped": {
    "head": {...},
    "chest": {...},
    "mainHand": {...}
  },
  "bags": [null, {...}, null, ...],
  "stats": {...}
}
```

**Purpose**: Sync inventory changes.

---

#### 7. Chat Broadcast

**Message:**
```json
{
  "type": "chat_message",
  "playerID": "p-abc123",
  "username": "Player1",
  "message": "Hello world!",
  "channel": "world",
  "timestamp": 1234567890
}
```

**Purpose**: Display chat message to clients.

---

#### 8. Level Data

**Message:**
```json
{
  "type": "level_data",
  "worldID": "game-123",
  "rooms": [
    {
      "id": "room-1",
      "prefabName": "combat_arena_01",
      "position": {"x": 0, "y": 0, "z": 0},
      "rotation": 90,
      "connections": ["room-2", "room-3"]
    }
  ],
  "spawnPoint": {"x": 5, "y": 0, "z": 5}
}
```

**Purpose**: Send procedurally generated level to client.

---

## Data Types

### Vector3
```json
{
  "x": float,
  "y": float,
  "z": float
}
```

### Item
```json
{
  "id": "item-123",
  "type": "sword",
  "name": "Flaming Longsword",
  "quality": "rare",
  "attributes": {
    "damage": 50,
    "fireResist": 10
  },
  "abilities": ["fireball"],
  "modifiers": ["pet"]
}
```

### Stats
```json
{
  "health": float,
  "maxHealth": float,
  "moveSpeed": float,
  "attackSpeed": float,
  "damage": float,
  "fireResist": float,
  ...
}
```

## Error Handling

### Server Errors
```json
{
  "type": "error",
  "code": "COOLDOWN_NOT_READY",
  "message": "Ability is on cooldown"
}
```

**Error Codes:**
- `INVALID_MESSAGE` - Malformed message
- `NOT_AUTHENTICATED` - Player not joined
- `COOLDOWN_NOT_READY` - Ability on cooldown
- `INVALID_TARGET` - Target out of range or invalid
- `INVENTORY_FULL` - Cannot pick up item
- `INVALID_ITEM` - Item doesn't exist

### Connection Errors

Client should handle:
- `WebSocket close` - Reconnect with exponential backoff
- `Timeout` - Retry connection
- `Invalid JSON` - Log error, ignore message

## Optimization Notes

### Current (JSON)
- Easy to debug
- Human-readable
- Slower serialization
- Larger message size

### Future (Protobuf)
- Fast serialization
- Compact binary format
- Requires schema compilation
- Will migrate in later phases

## Testing

### Mock Messages

Use these for testing client handling:

```json
// Simulate player joining
{"type": "joined", "playerID": "test-1", "worldID": "test", "position": {"x":0,"y":0,"z":0}, "stats": {}}

// Simulate world update
{"type": "world_state", "timestamp": 0, "players": [], "enemies": [], "projectiles": [], "groundItems": []}

// Simulate damage
{"type": "damage_event", "targetID": "e-1", "sourceID": "p-1", "damage": 50, "damageType": "fire", "isCrit": false, "isDead": false}
```

### Integration Tests

See `server/tests/integration/` for full message flow tests.

---

**Last Updated**: 2024
**Version**: 1.0 (JSON protocol)
