# CS Crawler - Godot Client

Multiplayer top-down action RPG client built with Godot 4.3+

## Project Structure

```
client/
├── scenes/          # Godot scene files (.tscn)
│   ├── player/     # Player character scenes
│   ├── enemies/    # Enemy type scenes
│   ├── abilities/  # Ability VFX and logic scenes
│   ├── ui/         # UI screens and components
│   └── levels/     # Level/room prefabs
├── scripts/        # GDScript files
│   ├── player/     # Player movement, stats, etc.
│   ├── enemies/    # Enemy AI and behaviors
│   ├── abilities/  # Ability implementations
│   ├── ui/         # UI controllers
│   ├── network/    # Client networking code
│   └── utils/      # Shared utilities
├── assets/         # Art and audio assets
│   ├── models/     # 3D models (.glb, .gltf)
│   ├── materials/  # Material resources
│   ├── textures/   # Texture files
│   ├── audio/      # Sound effects and music
│   └── vfx/        # Particle effects
└── tests/          # GDScript unit tests (Gut framework)
```

## Development Setup

1. **Install Godot 4.3+**: Download from [godotengine.org](https://godotengine.org/download)
2. **Open Project**: Launch Godot and open this directory
3. **Configure Server**: Update `NetworkManager` with server URL (default: ws://localhost:7000)

## Testing

Uses [Gut](https://github.com/bitwes/Gut) testing framework:

```bash
# Run tests from Godot editor
# Scene -> Test (bottom panel)
```

## Controls

- **WASD**: Movement
- **1-4**: Use abilities
- **I**: Toggle inventory
- **Enter**: Open chat
- **Mouse**: Aim/target

## Building

```bash
# Export for Windows/Linux/Mac
# Project -> Export -> Select platform
```

## Network Protocol

Communicates with Go server via WebSocket (JSON messages).
See [../docs/protocol.md](../docs/protocol.md) for message formats.
