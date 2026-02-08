package network

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/yourusername/cs-crawler-godot/server/internal/config"
	"github.com/yourusername/cs-crawler-godot/server/internal/database"
	"github.com/yourusername/cs-crawler-godot/server/internal/game"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Server handles WebSocket connections
type Server struct {
	addr              string
	gameServer        *game.Server
	db                *database.DB
	clients           map[*Client]bool
	mu                sync.RWMutex
	httpServer        *http.Server
	worldShutdownTimers map[string]*time.Timer
	shutdownMu        sync.Mutex
}

// NewServer creates a new network server
func NewServer(addr string, gameServer *game.Server, db *database.DB) *Server {
	s := &Server{
		addr:                addr,
		gameServer:          gameServer,
		db:                  db,
		clients:             make(map[*Client]bool),
		worldShutdownTimers: make(map[string]*time.Timer),
	}

	// Start broadcast loop
	go s.broadcastLoop()

	return s
}

// Start begins listening for connections
func (s *Server) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.handleWebSocket)
	mux.HandleFunc("/health", s.handleHealth)

	s.httpServer = &http.Server{
		Addr:    s.addr,
		Handler: mux,
	}

	return s.httpServer.ListenAndServe()
}

// Stop gracefully shuts down the server
func (s *Server) Stop() {
	if s.httpServer != nil {
		s.httpServer.Close()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Close all client connections
	for client := range s.clients {
		client.Close()
	}
}

// handleWebSocket upgrades HTTP connections to WebSocket
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := NewClient(conn, s)
	s.registerClient(client)

	log.Printf("Client connected from %s", r.RemoteAddr)

	// Handle client in goroutine
	go client.ReadPump()
	go client.WritePump()
}

// handleHealth returns server health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"clients": len(s.clients),
	})
}

// registerClient adds a client to the server
func (s *Server) registerClient(client *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.clients[client] = true
}

// unregisterClient removes a client from the server
func (s *Server) unregisterClient(client *Client) {
	s.mu.Lock()
	worldID := client.worldID
	s.mu.Unlock()

	s.mu.Lock()
	if _, ok := s.clients[client]; ok {
		delete(s.clients, client)
		client.Close()
		log.Printf("Client disconnected: %s", client.playerID)
	}
	s.mu.Unlock()

	// Check if world is now empty and schedule shutdown
	if worldID != "" {
		s.checkWorldEmpty(worldID)
	}
}

// BroadcastToWorld sends a message to all clients in a world
func (s *Server) BroadcastToWorld(worldID string, message map[string]interface{}) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for client := range s.clients {
		if client.worldID == worldID {
			client.Send(message)
		}
	}
}

// BroadcastToLobby sends a message to all clients not in a game world
func (s *Server) BroadcastToLobby(message map[string]interface{}) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for client := range s.clients {
		if client.worldID == "" {
			client.Send(message)
		}
	}
}

// SendToPlayer sends a message to a specific player by their ID
func (s *Server) SendToPlayer(playerID string, message map[string]interface{}) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for client := range s.clients {
		if client.playerID == playerID {
			client.Send(message)
			return
		}
	}
}

// broadcastLoop continuously broadcasts world state to all clients
func (s *Server) broadcastLoop() {
	ticker := time.NewTicker(time.Second / 60) // 60 broadcasts per second
	defer ticker.Stop()

	for range ticker.C {
		s.broadcastWorldStates()
		s.broadcastAIActions()
	}
}

// broadcastWorldStates sends scoped state to each connected client
func (s *Server) broadcastWorldStates() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for client := range s.clients {
		if client.worldID == "" || client.playerID == "" {
			continue
		}

		world, ok := s.gameServer.GetWorld(client.worldID)
		if !ok {
			continue
		}

		// Send scoped world state (only entities in player's active tiles)
		state := world.GetWorldStateForPlayer(client.playerID)
		if state == nil {
			continue
		}
		state["type"] = "world_state"
		state["timestamp"] = time.Now().UnixMilli()
		client.Send(state)

		// Stream any new tiles the player has moved near
		newTiles := world.GetNewTilesForPlayer(client.playerID)
		for _, tile := range newTiles {
			client.Send(map[string]interface{}{
				"type": "tile_data",
				"tile": tile.Serialize(),
			})
		}
	}
}

// broadcastAIActions sends character AI decisions to the appropriate clients
func (s *Server) broadcastAIActions() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Build client lookup by player ID
	clientByPlayer := make(map[string]*Client)
	worldIDs := make(map[string]bool)
	for client := range s.clients {
		if client.playerID != "" && client.worldID != "" {
			clientByPlayer[client.playerID] = client
			worldIDs[client.worldID] = true
		}
	}

	// Drain AI actions from each world
	for worldID := range worldIDs {
		world, ok := s.gameServer.GetWorld(worldID)
		if !ok {
			continue
		}

		actions := world.DrainPendingAIActions()
		for _, pa := range actions {
			client, ok := clientByPlayer[pa.PlayerID]
			if !ok {
				continue
			}

			// Send character action to the player's client
			msg := map[string]interface{}{
				"type":     "character_action",
				"action":   pa.Action.Type,
				"mood":     string(pa.Action.Mood),
				"dialogue": pa.Action.Dialogue,
			}
			if pa.Action.TargetID != "" {
				msg["targetId"] = pa.Action.TargetID
			}
			if pa.Action.Type == "ability" {
				msg["ability"] = string(pa.Action.Ability)
				msg["direction"] = map[string]interface{}{
					"x": pa.Action.Direction.X,
					"y": pa.Action.Direction.Y,
					"z": pa.Action.Direction.Z,
				}
				// Actually execute the ability on behalf of the character
				client.executeAIAbility(pa.Action)
			}
			client.Send(msg)
		}
	}
}

// checkWorldEmpty checks if a world has no players and schedules shutdown
func (s *Server) checkWorldEmpty(worldID string) {
	s.mu.RLock()
	hasPlayers := false
	for client := range s.clients {
		if client.worldID == worldID {
			hasPlayers = true
			break
		}
	}
	s.mu.RUnlock()

	if !hasPlayers {
		s.scheduleWorldShutdown(worldID)
	} else {
		s.cancelWorldShutdown(worldID)
	}
}

// scheduleWorldShutdown schedules a world to be destroyed after delay
func (s *Server) scheduleWorldShutdown(worldID string) {
	s.shutdownMu.Lock()
	defer s.shutdownMu.Unlock()

	// Cancel existing timer if any
	if timer, exists := s.worldShutdownTimers[worldID]; exists {
		timer.Stop()
	}

	// Get shutdown delay from config
	delay := time.Duration(config.Server.ShutdownDelaySeconds) * time.Second

	log.Printf("[WORLD] Scheduling shutdown for world %s in %v", worldID, delay)

	// Schedule new timer
	timer := time.AfterFunc(delay, func() {
		s.shutdownWorld(worldID)
	})

	s.worldShutdownTimers[worldID] = timer
}

// cancelWorldShutdown cancels a scheduled world shutdown
func (s *Server) cancelWorldShutdown(worldID string) {
	s.shutdownMu.Lock()
	defer s.shutdownMu.Unlock()

	if timer, exists := s.worldShutdownTimers[worldID]; exists {
		timer.Stop()
		delete(s.worldShutdownTimers, worldID)
		log.Printf("[WORLD] Cancelled shutdown for world %s (players rejoined)", worldID)
	}
}

// shutdownWorld destroys a world and cleans up resources
func (s *Server) shutdownWorld(worldID string) {
	s.shutdownMu.Lock()
	delete(s.worldShutdownTimers, worldID)
	s.shutdownMu.Unlock()

	s.gameServer.DestroyWorld(worldID)
	log.Printf("[WORLD] World %s shut down due to no players", worldID)
}
