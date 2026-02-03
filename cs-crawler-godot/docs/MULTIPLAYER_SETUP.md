# Local Network Multiplayer Setup

This guide explains how to set up and test multiplayer on a local network with multiple computers.

## Server Setup

### 1. Find Your Server IP Address

On the computer that will run the server:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (e.g., `192.168.1.100`)

**Linux/Mac:**
```bash
ifconfig
# or
ip addr show
```
Look for your local network IP (usually starts with `192.168.x.x` or `10.0.x.x`)

### 2. Start the Server

The server automatically binds to all network interfaces on port `7000`.

```bash
cd server
go run cmd/gameserver/main.go
```

Or use the compiled binary:
```bash
./gameserver.exe
```

The server will log:
```
WebSocket server listening on :7000
```

This means it's accessible at `<your-ip>:7000` from any computer on your network.

### 3. Firewall Configuration

**Important:** Make sure port 7000 is allowed through your firewall.

**Windows Firewall:**
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="CS Crawler Server" dir=in action=allow protocol=TCP localport=7000
```

**Linux (ufw):**
```bash
sudo ufw allow 7000/tcp
```

**Mac:**
- Go to System Preferences > Security & Privacy > Firewall > Firewall Options
- Add the gameserver executable and allow incoming connections

## Client Setup

### 1. Launch the Game

On any computer (including the server computer), launch the game client.

### 2. Configure Server IP

In the main menu, you'll see a "Server IP:Port" field at the top.

**Local Machine (same computer as server):**
```
localhost:7000
```

**Remote Machine (different computer on same network):**
```
192.168.1.100:7000
```
Replace `192.168.1.100` with the actual IP address of the server computer.

### 3. Connect

1. Enter a username
2. Enter the server IP:Port
3. Click "Connect"

The server IP is automatically saved, so you only need to enter it once.

## Testing Multiplayer

### Two Players on Same Network:

1. **Computer A (Server):**
   - Start the server: `./gameserver.exe`
   - Note your IP address (e.g., `192.168.1.100`)
   - Launch game client
   - Connect to `localhost:7000`

2. **Computer B (Client):**
   - Launch game client
   - Enter server IP: `192.168.1.100:7000`
   - Connect

3. **Play Together:**
   - Both players will see each other in the same game world
   - Movement, abilities, and enemies are synchronized
   - Test modifiers, abilities, and combat together!

## Troubleshooting

### Cannot Connect from Remote Computer

1. **Check Server is Running:**
   ```bash
   # On server computer
   netstat -an | findstr 7000
   # Should show: TCP 0.0.0.0:7000 LISTENING
   ```

2. **Ping Test:**
   ```bash
   # From client computer
   ping 192.168.1.100
   ```
   If ping fails, check network connectivity.

3. **Port Test:**
   ```bash
   # From client computer (if telnet is available)
   telnet 192.168.1.100 7000
   ```
   If connection refused, check firewall settings.

4. **Check Firewall:**
   - Temporarily disable firewall to test
   - If it works, add firewall rule for port 7000

### Connection Drops or Lag

1. **Check Network Quality:**
   - Ensure stable Wi-Fi or wired connection
   - Close bandwidth-heavy applications

2. **Server Resources:**
   - Monitor server CPU/memory usage
   - Lower tick rate if needed: `./gameserver.exe --tick-rate 30`

## Advanced Configuration

### Custom Server Port

Start server with custom port:
```bash
./gameserver.exe --addr :8000
```

Then connect clients to `<ip>:8000`

### Performance Tuning

Adjust server tick rate (default 60 TPS):
```bash
./gameserver.exe --tick-rate 120
```

Higher tick rate = smoother gameplay but more CPU usage.

## Settings Location

Client settings are saved to:
- Windows: `%APPDATA%\Godot\app_userdata\cs-crawler\server_settings.cfg`
- Linux: `~/.local/share/godot/app_userdata/cs-crawler/server_settings.cfg`
- Mac: `~/Library/Application Support/Godot/app_userdata/cs-crawler/server_settings.cfg`

You can manually edit this file to change the default server IP.
