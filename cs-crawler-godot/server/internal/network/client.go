package network

import (
	"encoding/json"
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
	username, _ := msg["username"].(string)
	worldID, _ := msg["worldID"].(string)

	if worldID == "" {
		worldID = "default"
	}

	// Get or create world
	world, ok := c.server.gameServer.GetWorld(worldID)
	if !ok {
		world = c.server.gameServer.CreateWorld(worldID)
	}

	// Create player
	player := game.NewPlayer(c.playerID, username)
	world.AddPlayer(player)

	c.playerID = player.ID
	c.worldID = worldID

	// Send join confirmation
	c.Send(map[string]interface{}{
		"type":     "joined",
		"playerID": player.ID,
		"worldID":  worldID,
	})

	log.Printf("Player %s joined world %s", username, worldID)
}

// handleMove processes player movement input
func (c *Client) handleMove(msg map[string]interface{}) {
	// TODO: Implement movement handling
}

// handleUseAbility processes ability usage
func (c *Client) handleUseAbility(msg map[string]interface{}) {
	// TODO: Implement ability handling
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
}
