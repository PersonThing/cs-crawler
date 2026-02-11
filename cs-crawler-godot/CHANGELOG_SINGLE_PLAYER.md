# Single-Player Mode Update

## What's New?

🎮 **CS Crawler now supports fully offline single-player mode!**

No PostgreSQL, no Docker, no complicated setup - just build and play.

## Quick Summary

### Before
- Required PostgreSQL database running
- Needed Docker for easy setup
- Required internet connection to play
- Complex environment setup

### After
- ✅ **SQLite database** (automatically created, no setup)
- ✅ **No Docker needed** for single-player
- ✅ **Offline play** - works without internet
- ✅ **One command build** - just run `build.bat` or `build.sh`
- ✅ **Automatic server launch** - client starts the server for you

## New Features

### 1. SQLite Database Support
- Lightweight, file-based database
- No installation or configuration required
- Stores player data in `server/data/players.db`
- Pure Go implementation (no C compiler needed)

### 2. LocalServerManager (Godot)
- Automatically finds and launches the game server
- Manages server lifecycle (start/stop)
- Creates necessary directories
- Handles config file setup
- Cross-platform (Windows/Linux/Mac)

### 3. Single-Player Button
- New button on main menu: **"Single Player (Local Server)"**
- Click to start local server and connect
- No need to manually run the server

### 4. Smart Build System
- Build scripts automatically copy config files
- No manual file management needed
- Works out of the box

## Technical Details

### Architecture Changes

**Database Layer:**
- Added `DatabaseType` enum (SQLite, PostgreSQL)
- Modified `database.Connect()` to support both types
- Schema creation adapted for SQLite vs PostgreSQL differences
- Uses `modernc.org/sqlite` (pure Go, no CGO)

**Server:**
- New `-db-type` flag (default: `sqlite`)
- New `-db-file` flag (default: `./data/players.db`)
- Config files automatically loaded from `./config/`

**Client:**
- New `LocalServerManager` autoload singleton
- Updated `MainMenu` with single-player UI
- Enhanced `NetworkManager` with fallback logic

### Files Added

1. **client/scripts/autoload/local_server_manager.gd**
   - Server process manager
   - Health monitoring
   - Config setup
   - Cross-platform process launching

2. **server/build.bat** / **server/build.sh**
   - Smart build scripts
   - Auto-copy config files
   - Clear usage instructions

3. **docs/SINGLE_PLAYER_MODE.md**
   - Comprehensive documentation
   - Architecture diagrams
   - Troubleshooting guide

4. **SINGLE_PLAYER_QUICKSTART.md**
   - 2-minute setup guide
   - Simple instructions

### Files Modified

1. **server/internal/database/database.go**
   - Added SQLite support
   - Dual-database architecture
   - Auto-create directories

2. **server/cmd/gameserver/main.go**
   - Added database type selection
   - Environment variable support
   - Better logging

3. **server/go.mod**
   - Added `modernc.org/sqlite` dependency

4. **client/project.godot**
   - Registered `LocalServerManager` autoload

5. **client/scripts/ui/main_menu.gd**
   - Added single-player button
   - Local server integration

6. **client/scripts/autoload/network_manager.gd**
   - Added connection fallback logic

### Dependencies

**New Go Dependency:**
```go
modernc.org/sqlite v1.29.1
```

Pure Go SQLite implementation - no CGO/C compiler required!

## Usage Examples

### Single-Player Mode
```bash
# Build once
cd server
build.bat  # Windows

# Then just play!
# Launch Godot → Click "Single Player" → Done!
```

### Manual Server (Single-Player)
```bash
cd server
./gameserver.exe -db-type sqlite
```

### Manual Server (Multiplayer)
```bash
cd server
./gameserver.exe -db-type postgres -db-host localhost -db-port 7001
```

## Compatibility

- ✅ **Windows** - Fully tested
- ✅ **Linux** - Tested
- ✅ **macOS** - Tested

## Performance

Single-player mode:
- Zero network latency
- Instant response
- Local file I/O only
- Same gameplay as multiplayer

## Migration Guide

### From Old Setup (PostgreSQL only)
No migration needed! Old multiplayer mode still works:
1. Keep using PostgreSQL for multiplayer servers
2. Use SQLite for single-player/offline play
3. Both modes work independently

### Save Files
- **Multiplayer:** Stored on PostgreSQL server
- **Single-Player:** Stored in `server/data/players.db`
- Characters are separate (multiplayer ≠ single-player)

## Known Limitations

1. **Single-player only**
   - Local server = solo play only
   - For multiplayer, use PostgreSQL server

2. **No cross-save**
   - Multiplayer and single-player saves are separate
   - Future: May add import/export feature

3. **Config files**
   - Config files must exist in project root
   - Build script copies them automatically

## Future Enhancements

Potential improvements:
- [ ] LAN multiplayer with SQLite
- [ ] Cloud save sync for single-player
- [ ] Import/export characters between modes
- [ ] In-game server console

## Troubleshooting

### "Could not find server executable"
**Fix:** Run `build.bat` or `build.sh` first

### "Config directory not found"
**Fix:** Build script should copy configs. If not, manually copy `config/` to `server/config/`

### "Server startup timed out"
**Fix:** Check if port 7000 is available, rebuild server

### Server crashes
**Fix:** Run server manually to see error:
```bash
cd server
./gameserver.exe -db-type sqlite
```

## Support

- 📖 Full docs: [docs/SINGLE_PLAYER_MODE.md](docs/SINGLE_PLAYER_MODE.md)
- 🚀 Quick start: [SINGLE_PLAYER_QUICKSTART.md](SINGLE_PLAYER_QUICKSTART.md)
- 🔧 Server README: [server/README.md](server/README.md)

## Credits

This feature enables offline gameplay and removes the barrier of database setup, making the game accessible to more players!

---

**Version:** Single-Player Mode v1.0
**Date:** 2026-02-10
