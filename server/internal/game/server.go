package game

import (
	"log"
	"sync"
	"time"

	"github.com/PersonThing/cs-crawler/server/internal/config"
	"github.com/PersonThing/cs-crawler/server/internal/database"
)

// Server represents the authoritative game server
type Server struct {
	tickRate   int
	tickPeriod time.Duration
	running    bool
	stopChan   chan struct{}
	mu         sync.RWMutex

	// Game state
	worlds map[string]*World

	// Services
	Lobby *LobbyService
	Chat  *ChatService

	// Database
	db *database.DB

	// LLM Provider for AI combat
	llmProvider LLMProvider
}

// NewServer creates a new game server
func NewServer(tickRate int, db *database.DB, llmProvider LLMProvider) *Server {
	return &Server{
		tickRate:    tickRate,
		tickPeriod:  time.Second / time.Duration(tickRate),
		stopChan:    make(chan struct{}),
		worlds:      make(map[string]*World),
		Lobby:       NewLobbyService(),
		Chat:        NewChatService(),
		db:          db,
		llmProvider: llmProvider,
	}
}

// GetDB returns the database reference
func (s *Server) GetDB() *database.DB {
	return s.db
}

// Start begins the game loop
func (s *Server) Start() {
	s.mu.Lock()
	s.running = true
	s.mu.Unlock()

	ticker := time.NewTicker(s.tickPeriod)
	defer ticker.Stop()

	// Periodic save every 30 seconds
	saveTicker := time.NewTicker(30 * time.Second)
	defer saveTicker.Stop()

	log.Printf("Game loop started at %d TPS", s.tickRate)

	for {
		select {
		case <-ticker.C:
			s.tick()
		case <-saveTicker.C:
			s.SaveAllPlayers()
		case <-s.stopChan:
			log.Println("Game loop stopped")
			return
		}
	}
}

// Stop halts the game loop
func (s *Server) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		s.running = false
		close(s.stopChan)
	}
}

// tick processes one game update
func (s *Server) tick() {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Update all active worlds
	for _, world := range s.worlds {
		world.Update(s.tickPeriod)
	}
}

// SaveAllPlayers saves all players in all worlds to the database
func (s *Server) SaveAllPlayers() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	saved := 0
	for _, world := range s.worlds {
		players := world.GetPlayers()
		for _, player := range players {
			if err := s.savePlayer(player); err != nil {
				log.Printf("[SAVE] Error saving player %s: %v", player.Username, err)
			} else {
				saved++
			}
		}
	}

	if saved > 0 && config.Server.Debug.LogPlayerSaves {
		log.Printf("[SAVE] Periodic save: %d players saved", saved)
	}
}

// SavePlayer saves a single player to the database
func (s *Server) SavePlayer(player *Player) error {
	return s.savePlayer(player)
}

func (s *Server) savePlayer(player *Player) error {
	equippedJSON, bagsJSON, err := player.ToSaveData()
	if err != nil {
		return err
	}

	return s.db.SavePlayer(&database.PlayerData{
		Username:      player.Username,
		PositionX:     player.Position.X,
		PositionY:     player.Position.Y,
		PositionZ:     player.Position.Z,
		Rotation:      player.Rotation,
		Health:        player.Health,
		EquippedItems: equippedJSON,
		BagItems:      bagsJSON,
	})
}

// GetWorlds returns all active worlds (thread-safe copy)
func (s *Server) GetWorlds() map[string]*World {
	s.mu.RLock()
	defer s.mu.RUnlock()

	worlds := make(map[string]*World, len(s.worlds))
	for k, v := range s.worlds {
		worlds[k] = v
	}
	return worlds
}

// CreateWorld creates a new game world
func (s *Server) CreateWorld(worldID string) *World {
	s.mu.Lock()
	defer s.mu.Unlock()

	world := NewWorld(worldID, s.llmProvider)
	s.worlds[worldID] = world

	log.Printf("Created world: %s", worldID)
	return world
}

// GetWorld returns a world by ID
func (s *Server) GetWorld(worldID string) (*World, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	world, ok := s.worlds[worldID]
	return world, ok
}

// DestroyWorld removes a world
func (s *Server) DestroyWorld(worldID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.worlds, worldID)
	log.Printf("Destroyed world: %s", worldID)
}
