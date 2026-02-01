package game

import (
	"sync"
	"time"
)

// World represents a game instance
type World struct {
	ID      string
	mu      sync.RWMutex
	created time.Time

	// Entities
	players     map[string]*Player
	enemies     map[string]*Enemy
	projectiles map[string]*Projectile
}

// NewWorld creates a new game world
func NewWorld(id string) *World {
	return &World{
		ID:          id,
		created:     time.Now(),
		players:     make(map[string]*Player),
		enemies:     make(map[string]*Enemy),
		projectiles: make(map[string]*Projectile),
	}
}

// Update processes one world tick
func (w *World) Update(delta time.Duration) {
	w.mu.Lock()
	defer w.mu.Unlock()

	deltaSeconds := delta.Seconds()

	// Update players
	for _, player := range w.players {
		player.Update(deltaSeconds)
	}

	// Update enemies
	for _, enemy := range w.enemies {
		enemy.Update(deltaSeconds)
	}

	// Update projectiles
	for id, projectile := range w.projectiles {
		projectile.Update(deltaSeconds)
		if projectile.ShouldDestroy() {
			delete(w.projectiles, id)
		}
	}
}

// AddPlayer adds a player to the world
func (w *World) AddPlayer(player *Player) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.players[player.ID] = player
}

// RemovePlayer removes a player from the world
func (w *World) RemovePlayer(playerID string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	delete(w.players, playerID)
}

// GetPlayers returns all players (thread-safe copy)
func (w *World) GetPlayers() map[string]*Player {
	w.mu.RLock()
	defer w.mu.RUnlock()

	players := make(map[string]*Player, len(w.players))
	for k, v := range w.players {
		players[k] = v
	}
	return players
}

// GetWorldState returns serializable world state
func (w *World) GetWorldState() map[string]interface{} {
	w.mu.RLock()
	defer w.mu.RUnlock()

	players := make([]map[string]interface{}, 0, len(w.players))
	for _, p := range w.players {
		players = append(players, p.Serialize())
	}

	enemies := make([]map[string]interface{}, 0, len(w.enemies))
	for _, e := range w.enemies {
		enemies = append(enemies, e.Serialize())
	}

	projectiles := make([]map[string]interface{}, 0, len(w.projectiles))
	for _, proj := range w.projectiles {
		projectiles = append(projectiles, proj.Serialize())
	}

	return map[string]interface{}{
		"players":     players,
		"enemies":     enemies,
		"projectiles": projectiles,
	}
}
