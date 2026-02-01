package network

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/yourusername/cs-crawler-godot/server/internal/game"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8192
)

// Client represents a connected WebSocket client
type Client struct {
	conn     *websocket.Conn
	server   *Server
	send     chan []byte
	playerID string
	worldID  string
}

// NewClient creates a new client
func NewClient(conn *websocket.Conn, server *Server) *Client {
	return &Client{
		conn:   conn,
		server: server,
		send:   make(chan []byte, 256),
	}
}

// ReadPump handles incoming messages from the client
func (c *Client) ReadPump() {
	defer func() {
		c.server.unregisterClient(c)
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		c.handleMessage(message)
	}
}

// WritePump sends messages to the client
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming client messages
func (c *Client) handleMessage(data []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Failed to parse message: %v", err)
		return
	}

	msgType, ok := msg["type"].(string)
	if !ok {
		log.Printf("Message missing type field")
		return
	}

	switch msgType {
	case "join":
		c.handleJoin(msg)
	case "move":
		c.handleMove(msg)
	case "use_ability":
		c.handleUseAbility(msg)
	default:
		log.Printf("Unknown message type: %s", msgType)
	}
}

// handleJoin processes a player join request
func (c *Client) handleJoin(msg map[string]interface{}) {
	log.Printf("[JOIN] Received join request")
	username, _ := msg["username"].(string)
	worldID, _ := msg["worldID"].(string)

	log.Printf("[JOIN] Username: %s, WorldID: %s", username, worldID)

	if username == "" {
		log.Printf("[JOIN] ERROR: Empty username")
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "INVALID_USERNAME",
			"message": "Username is required",
		})
		return
	}

	if worldID == "" {
		worldID = "default"
	}

	// Get or create world
	world, ok := c.server.gameServer.GetWorld(worldID)
	if !ok {
		log.Printf("[JOIN] Creating new world: %s", worldID)
		world = c.server.gameServer.CreateWorld(worldID)
	}

	// Generate unique player ID
	c.playerID = generatePlayerID()
	log.Printf("[JOIN] Generated player ID: %s", c.playerID)

	// Create player
	player := game.NewPlayer(c.playerID, username)
	world.AddPlayer(player)

	c.worldID = worldID

	// Send join confirmation with initial state
	joinResponse := map[string]interface{}{
		"type":     "joined",
		"playerID": player.ID,
		"worldID":  worldID,
		"position": player.Position,
		"stats": map[string]interface{}{
			"health":    player.Health,
			"maxHealth": player.MaxHealth,
			"moveSpeed": player.MoveSpeed,
		},
	}

	log.Printf("[JOIN] Sending join confirmation: %+v", joinResponse)
	c.Send(joinResponse)
	log.Printf("[JOIN] Join confirmation sent")

	log.Printf("Player %s (%s) joined world %s", username, c.playerID, worldID)
}

// handleMove processes player movement input
func (c *Client) handleMove(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		log.Printf("[MOVE] Player not joined yet, ignoring move message")
		return // Not joined yet
	}

	// Parse velocity
	velocityMap, ok := msg["velocity"].(map[string]interface{})
	if !ok {
		log.Printf("[MOVE] Invalid velocity format in move message")
		return
	}

	velocity := game.Vector3{
		X: getFloat64(velocityMap, "x"),
		Y: getFloat64(velocityMap, "y"),
		Z: getFloat64(velocityMap, "z"),
	}

	log.Printf("[MOVE] Player %s velocity: (%.2f, %.2f, %.2f)", c.playerID, velocity.X, velocity.Y, velocity.Z)

	// Get world and player
	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		log.Printf("[MOVE] World %s not found", c.worldID)
		return
	}

	players := world.GetPlayers()
	player, ok := players[c.playerID]
	if !ok {
		log.Printf("[MOVE] Player %s not found in world", c.playerID)
		return
	}

	// Update player velocity (server will update position in game loop)
	player.SetVelocity(velocity)
	log.Printf("[MOVE] Player %s position: (%.2f, %.2f, %.2f)", c.playerID, player.Position.X, player.Position.Y, player.Position.Z)
}

// handleUseAbility processes ability usage
func (c *Client) handleUseAbility(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		log.Printf("[ABILITY] Player not joined yet, ignoring ability message")
		return
	}

	// Parse ability type
	abilityTypeStr, ok := msg["abilityType"].(string)
	if !ok {
		log.Printf("[ABILITY] Invalid ability type in message")
		return
	}
	abilityType := game.AbilityType(abilityTypeStr)

	// Parse target direction
	directionMap, ok := msg["direction"].(map[string]interface{})
	if !ok {
		log.Printf("[ABILITY] Invalid direction in message")
		return
	}

	direction := game.Vector3{
		X: getFloat64(directionMap, "x"),
		Y: getFloat64(directionMap, "y"),
		Z: getFloat64(directionMap, "z"),
	}

	log.Printf("[ABILITY] Player %s using ability %s in direction (%.2f, %.2f, %.2f)",
		c.playerID, abilityType, direction.X, direction.Y, direction.Z)

	// Get world and player
	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		log.Printf("[ABILITY] World %s not found", c.worldID)
		return
	}

	players := world.GetPlayers()
	player, ok := players[c.playerID]
	if !ok {
		log.Printf("[ABILITY] Player %s not found in world", c.playerID)
		return
	}

	// Try to use ability
	ability, err := player.Abilities.UseAbility(abilityType)
	if err != nil {
		log.Printf("[ABILITY] Cannot use ability: %v", err)
		c.Send(map[string]interface{}{
			"type":    "ability_failed",
			"reason":  err.Error(),
			"ability": string(abilityType),
		})
		return
	}

	log.Printf("[ABILITY] Ability %s used successfully", abilityType)

	// Create projectile based on ability
	// Spawn projectile at player height (0.9 units above ground, which is half player height of 1.8)
	projectileID := generateProjectileID()
	spawnPosition := player.Position
	spawnPosition.Y = 0.9 // Half of player height (1.8 / 2)

	projectile := game.NewProjectile(
		projectileID,
		player.ID,
		spawnPosition,
		game.Vector3{
			X: direction.X * ability.Speed,
			Y: direction.Y * ability.Speed,
			Z: direction.Z * ability.Speed,
		},
		ability.Damage,
		ability.DamageType,
		string(abilityType),
	)

	world.AddProjectile(projectile)

	// Broadcast ability cast to all clients in world
	c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
		"type":        "ability_cast",
		"playerID":    player.ID,
		"abilityType": string(abilityType),
		"position":    player.Position,
		"direction":   direction,
		"projectileID": projectileID,
	})

	log.Printf("[ABILITY] Projectile %s created for player %s", projectileID, c.playerID)
}

// generateProjectileID creates a unique projectile ID
func generateProjectileID() string {
	return fmt.Sprintf("proj-%d", time.Now().UnixNano())
}

// Send queues a message to be sent to the client
func (c *Client) Send(message map[string]interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	select {
	case c.send <- data:
	default:
		log.Printf("Client send buffer full, dropping message")
	}
}

// Close gracefully closes the client connection
func (c *Client) Close() {
	close(c.send)

	// Remove player from world
	if c.worldID != "" && c.playerID != "" {
		if world, ok := c.server.gameServer.GetWorld(c.worldID); ok {
			world.RemovePlayer(c.playerID)
			log.Printf("Player %s removed from world %s", c.playerID, c.worldID)
		}
	}
}

// Helper functions
func generatePlayerID() string {
	return fmt.Sprintf("p-%d", time.Now().UnixNano())
}

func getFloat64(m map[string]interface{}, key string) float64 {
	if val, ok := m[key].(float64); ok {
		return val
	}
	return 0.0
}
