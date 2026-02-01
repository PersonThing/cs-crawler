package game

import (
	"log"
	"sync"
	"time"
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
}

// NewServer creates a new game server
func NewServer(tickRate int) *Server {
	return &Server{
		tickRate:   tickRate,
		tickPeriod: time.Second / time.Duration(tickRate),
		stopChan:   make(chan struct{}),
		worlds:     make(map[string]*World),
	}
}

// Start begins the game loop
func (s *Server) Start() {
	s.mu.Lock()
	s.running = true
	s.mu.Unlock()

	ticker := time.NewTicker(s.tickPeriod)
	defer ticker.Stop()

	log.Printf("Game loop started at %d TPS", s.tickRate)

	for {
		select {
		case <-ticker.C:
			s.tick()
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

// CreateWorld creates a new game world
func (s *Server) CreateWorld(worldID string) *World {
	s.mu.Lock()
	defer s.mu.Unlock()

	world := NewWorld(worldID)
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
