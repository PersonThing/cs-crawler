# Single-Player Mode

CS Crawler now supports a **single-player mode** that runs a local server instance automatically when you don't have internet access or can't connect to a remote server.

## Features

- **No PostgreSQL required**: Single-player mode uses SQLite, a lightweight database that requires no setup
- **Automatic local server**: The game can automatically start a local Go server instance
- **Offline play**: Play the game without an internet connection
- **Same gameplay**: Full game features available in single-player mode
- **Easy setup**: Just build the server once and you're ready to go

## Quick Start

### 1. Build the Server

First, you need to build the game server executable:

#### Windows
```bash
cd cs-crawler-godot/server
build.bat
```

#### Linux/Mac
```bash
cd cs-crawler-godot/server
chmod +x build.sh
./build.sh
```

This will create a `gameserver.exe` (Windows) or `gameserver` (Linux/Mac) executable in the `server` directory.

### 2. Launch Single-Player Mode

1. Start the Godot client
2. On the main menu, click **"Single Player (Local Server)"**
3. Enter your username
4. The game will automatically:
   - Start a local server instance
   - Create a SQLite database in `server/data/players.db`
   - Connect you to the local server
   - Load you into the game

That's it! No database setup, no configuration files needed.

## How It Works

### Architecture

```
┌─────────────────┐
│  Godot Client   │
│                 │
│  Main Menu      │
└────────┬────────┘
         │
         │ Clicks "Single Player"
         │
         v
┌─────────────────┐
│ LocalServer     │
│ Manager         │
│                 │
│ 1. Finds server │
│ 2. Starts it    │
│ 3. Waits ready  │
└────────┬────────┘
         │
         │ Server started
         │
         v
┌─────────────────┐
│  Go Server      │
│                 │
│  - SQLite DB    │
│  - Port 7000    │
│  - Game logic   │
└─────────────────┘
```

### Components

1. **LocalServerManager** (Godot autoload)
   - Manages the lifecycle of the local server process
   - Finds the server executable automatically
   - Creates necessary directories
   - Monitors server health

2. **SQLite Database**
   - Lightweight, file-based database
   - No installation required
   - Stores player data in `server/data/players.db`
   - Automatically created on first run

3. **Game Server**
   - Same server used for multiplayer
   - Runs locally on port 7000
   - Supports both SQLite and PostgreSQL
   - Pure Go implementation (no CGO/C dependencies)

## Server Executable Locations

The LocalServerManager searches for the server executable in these locations:

1. `../server/gameserver.exe` (Windows) or `../server/gameserver` (Linux/Mac)
2. `../../server/gameserver.exe` or `../../server/gameserver`

If you move the client or server, make sure the relative paths still work, or update the search paths in [local_server_manager.gd](../client/scripts/autoload/local_server_manager.gd).

## Manual Server Control

You can also run the server manually if you prefer:

### Start Server with SQLite
```bash
cd cs-crawler-godot/server
./gameserver.exe -db-type sqlite -db-file ./data/players.db
```

### Start Server with PostgreSQL
```bash
./gameserver.exe -db-type postgres -db-host localhost -db-port 7001 -db-user crawler -db-password crawler
```

### Server Command-Line Options

- `-addr` - Server address (default: `:7000`)
- `-db-type` - Database type: `sqlite` or `postgres` (default: `sqlite`)
- `-db-file` - SQLite database file path (default: `./data/players.db`)
- `-db-host` - PostgreSQL host (default: `localhost`)
- `-db-port` - PostgreSQL port (default: `7001`)
- `-db-user` - PostgreSQL user (default: `crawler`)
- `-db-password` - PostgreSQL password (default: `crawler`)
- `-db-name` - PostgreSQL database name (default: `crawler`)
- `-tick-rate` - Game loop ticks per second (default: `60`)

## Multiplayer vs Single-Player

| Feature | Multiplayer | Single-Player |
|---------|-------------|---------------|
| Database | PostgreSQL | SQLite |
| Setup | Requires database | No setup needed |
| Server | Remote/hosted | Local process |
| Players | Multiple | Solo only |
| Internet | Required | Not required |
| Performance | Depends on connection | Local, fast |
| Data persistence | Server-side | Local file |

## Troubleshooting

### "Could not find server executable"

**Solution**: Build the server first using `build.bat` or `build.sh` in the `server` directory.

### "Server startup timed out"

**Possible causes**:
- Port 7000 is already in use
- Server executable is corrupted
- Missing config files

**Solution**:
1. Check if another server is running on port 7000
2. Rebuild the server executable
3. Ensure `server/config/` directory exists

### Server crashes immediately

**Solution**: Run the server manually to see error messages:
```bash
cd cs-crawler-godot/server
./gameserver.exe -db-type sqlite
```

Check the output for errors.

### Cannot connect to local server

**Solution**:
1. Wait a few seconds - the server takes time to start
2. Check Windows Firewall isn't blocking the connection
3. Verify port 7000 is available

## Database Migration

### From Multiplayer to Single-Player

Your multiplayer character data is stored on the remote server and won't automatically transfer. Single-player creates a fresh character.

### Backing Up Single-Player Data

Your single-player character is saved in `server/data/players.db`. To back up:

```bash
# Backup
cp server/data/players.db server/data/players.db.backup

# Restore
cp server/data/players.db.backup server/data/players.db
```

## Development

### Building for Distribution

When distributing your game, include:

1. The Godot client executable
2. The server executable (`gameserver.exe` or `gameserver`)
3. The `server/config/` directory with game configuration files

The SQLite database will be created automatically on first run.

### Customizing Server Paths

Edit [local_server_manager.gd](../client/scripts/autoload/local_server_manager.gd):

```gdscript
const SERVER_EXECUTABLE_PATHS = [
    "your/custom/path/gameserver.exe",
    "another/path/gameserver",
]
```

## Performance Notes

- SQLite is fast enough for single-player
- Local server eliminates network latency
- No internet bandwidth usage
- Server automatically shuts down when you close the game

## Security Notes

- Local server only binds to `localhost` by default
- No external connections accepted
- SQLite database stored locally
- Same security as any local application

## Future Improvements

Planned features:
- LAN multiplayer with local server
- Cloud save sync for single-player
- Convert between SQLite and PostgreSQL
- Auto-update server executable

---

**Questions?** Check the main [README](../README.md) or open an issue on GitHub.
