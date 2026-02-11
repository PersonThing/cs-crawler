# Single-Player Mode - Quick Start

Get playing offline in 2 minutes! 🎮

## Step 1: Build the Server (One Time Setup)

Open a terminal and run:

### Windows
```bash
cd cs-crawler-godot/server
build.bat
```

### Linux/Mac
```bash
cd cs-crawler-godot/server
./build.sh
```

✅ You should see: "Build successful! Server executable: gameserver.exe"
✅ Config files will be automatically copied to the server directory

## Step 2: Play!

1. Launch the game (run Godot client)
2. Click **"Single Player (Local Server)"** on the main menu
3. Enter a username
4. Click Connect

That's it! The game will:
- ✅ Start a local server automatically
- ✅ Create a SQLite database (no PostgreSQL needed!)
- ✅ Connect you to the game

## What You Get

- ✅ **Full game features** - everything works offline
- ✅ **No database setup** - SQLite is automatically created
- ✅ **No internet required** - play anywhere
- ✅ **Fast** - zero network latency
- ✅ **Your data** - saved locally in `server/data/players.db`

## Troubleshooting

**"Could not find server executable"**
- You need to build the server first (Step 1)

**"Server startup timed out"**
- Check if another program is using port 7000
- Try rebuilding the server

**Still having issues?**
- See the full guide: [docs/SINGLE_PLAYER_MODE.md](docs/SINGLE_PLAYER_MODE.md)

---

**Want multiplayer?** Use the regular "Connect" button and enter your server IP.
