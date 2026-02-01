package network

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/yourusername/cs-crawler-godot/server/internal/game"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Server handles WebSocket connections
type Server struct {
	addr       string
	gameServer *game.Server
	clients    map[*Client]bool
	mu         sync.RWMutex
	httpServer *http.Server
}

// NewServer creates a new network server
func NewServer(addr string, gameServer *game.Server) *Server {
	s := &Server{
		addr:       addr,
		gameServer: gameServer,
		clients:    make(map[*Client]bool),
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
	defer s.mu.Unlock()

	if _, ok := s.clients[client]; ok {
		delete(s.clients, client)
		client.Close()
		log.Printf("Client disconnected: %s", client.playerID)
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

// broadcastLoop continuously broadcasts world state to all clients
func (s *Server) broadcastLoop() {
	ticker := time.NewTicker(time.Second / 60) // 60 broadcasts per second
	defer ticker.Stop()

	for range ticker.C {
		s.broadcastWorldStates()
	}
}

// broadcastWorldStates sends current state to all connected clients
func (s *Server) broadcastWorldStates() {
	worlds := s.gameServer.GetWorlds()

	for worldID, world := range worlds {
		state := world.GetWorldState()
		state["type"] = "world_state"
		state["timestamp"] = time.Now().UnixMilli()

		s.BroadcastToWorld(worldID, state)
	}
}
