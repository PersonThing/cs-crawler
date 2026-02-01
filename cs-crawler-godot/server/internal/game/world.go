package game

import (
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
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

	// Events (for broadcasting)
	damageEvents []DamageEvent
	deathEvents  []DeathEvent
}

// NewWorld creates a new game world
func NewWorld(id string) *World {
	w := &World{
		ID:           id,
		created:      time.Now(),
		players:      make(map[string]*Player),
		enemies:      make(map[string]*Enemy),
		projectiles:  make(map[string]*Projectile),
		damageEvents: make([]DamageEvent, 0),
		deathEvents:  make([]DeathEvent, 0),
	}

	// Spawn initial enemies
	w.spawnInitialEnemies()

	return w
}

// spawnInitialEnemies spawns starting enemies in the world
func (w *World) spawnInitialEnemies() {
	// Load spawn pattern from config
	pattern, ok := config.GetSpawnPattern("default")
	if !ok {
		log.Println("[WORLD] Spawn pattern 'default' not found, using fallback")
		w.spawnCirclePattern(5, "basic", 10.0, Vector3{X: 0, Y: 0, Z: 0})
		return
	}

	// Spawn based on pattern type
	switch pattern.Pattern {
	case "circle":
		center := Vector3{X: 0, Y: 0, Z: 0}
		if len(pattern.CenterPosition) >= 3 {
			center = Vector3{
				X: pattern.CenterPosition[0],
				Y: pattern.CenterPosition[1],
				Z: pattern.CenterPosition[2],
			}
		}
		w.spawnCirclePattern(pattern.Count, pattern.EnemyType, pattern.Radius, center)
	case "grid":
		w.spawnGridPattern(pattern)
	default:
		log.Printf("[WORLD] Unknown spawn pattern: %s", pattern.Pattern)
	}
}

// spawnCirclePattern spawns enemies in a circle
func (w *World) spawnCirclePattern(count int, enemyType string, radius float64, center Vector3) {
	for i := 0; i < count; i++ {
		angle := float64(i) * (2 * math.Pi / float64(count))
		x := center.X + radius*math.Cos(angle)
		z := center.Z + radius*math.Sin(angle)

		enemy := NewEnemy(
			fmt.Sprintf("enemy-%d", i),
			enemyType,
			Vector3{X: x, Y: center.Y, Z: z},
		)
		w.enemies[enemy.ID] = enemy
	}
	log.Printf("[WORLD] Spawned %d enemies in circle pattern", count)
}

// spawnGridPattern spawns enemies in a grid
func (w *World) spawnGridPattern(pattern *config.SpawnPattern) {
	if len(pattern.EnemyTypes) == 0 {
		log.Println("[WORLD] Grid pattern requires enemyTypes")
		return
	}

	enemyIndex := 0
	for row := 0; row < pattern.Rows; row++ {
		for col := 0; col < pattern.Columns; col++ {
			x := float64(col) * pattern.Spacing
			z := float64(row) * pattern.Spacing

			enemyType := pattern.EnemyTypes[enemyIndex%len(pattern.EnemyTypes)]
			enemy := NewEnemy(
				fmt.Sprintf("enemy-grid-%d-%d", row, col),
				enemyType,
				Vector3{X: x, Y: 0, Z: z},
			)
			w.enemies[enemy.ID] = enemy
			enemyIndex++
		}
	}
	log.Printf("[WORLD] Spawned %d enemies in grid pattern", pattern.Rows*pattern.Columns)
}

// Update processes one world tick
func (w *World) Update(delta time.Duration) {
	w.mu.Lock()
	defer w.mu.Unlock()

	deltaSeconds := delta.Seconds()

	// Clear events from previous tick
	w.damageEvents = w.damageEvents[:0]
	w.deathEvents = w.deathEvents[:0]

	// Update players
	for _, player := range w.players {
		player.Update(deltaSeconds)
	}

	// Update enemies
	for _, enemy := range w.enemies {
		enemy.Update(deltaSeconds)
	}

	// Update projectiles and check collisions
	for id, projectile := range w.projectiles {
		projectile.Update(deltaSeconds)

		// Check collision with enemies
		if enemy := CheckProjectileCollision(projectile, w.enemies, projectile.Radius); enemy != nil {
			// Apply damage
			damageInfo := DamageInfo{
				Amount:   projectile.Damage,
				Type:     projectile.DamageType,
				SourceID: projectile.OwnerID,
				TargetID: enemy.ID,
			}

			died := ApplyDamage(enemy, damageInfo)

			// Record damage event
			w.damageEvents = append(w.damageEvents, DamageEvent{
				TargetID: enemy.ID,
				Damage:   damageInfo.Amount,
				Type:     damageInfo.Type,
			})

			// Record death event if enemy died
			if died {
				w.deathEvents = append(w.deathEvents, DeathEvent{
					EntityID:   enemy.ID,
					EntityType: "enemy",
					KillerID:   projectile.OwnerID,
				})
			}

			// Destroy projectile on hit
			delete(w.projectiles, id)
			continue
		}

		// Destroy projectile if lifetime expired
		if projectile.ShouldDestroy() {
			delete(w.projectiles, id)
		}
	}

	// Remove dead enemies (with a small delay to allow client to show death)
	for id, enemy := range w.enemies {
		if enemy.IsDead() && time.Since(enemy.LastUpdate) > 2*time.Second {
			delete(w.enemies, id)
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

// AddProjectile adds a projectile to the world
func (w *World) AddProjectile(projectile *Projectile) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.projectiles[projectile.ID] = projectile
}

// GetEnemies returns all enemies (thread-safe copy)
func (w *World) GetEnemies() map[string]*Enemy {
	w.mu.RLock()
	defer w.mu.RUnlock()

	enemies := make(map[string]*Enemy, len(w.enemies))
	for k, v := range w.enemies {
		enemies[k] = v
	}
	return enemies
}

// GetEvents returns damage and death events from this tick
func (w *World) GetEvents() ([]DamageEvent, []DeathEvent) {
	w.mu.RLock()
	defer w.mu.RUnlock()

	damages := make([]DamageEvent, len(w.damageEvents))
	copy(damages, w.damageEvents)

	deaths := make([]DeathEvent, len(w.deathEvents))
	copy(deaths, w.deathEvents)

	return damages, deaths
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

	// Include events
	damageEvents := make([]map[string]interface{}, 0, len(w.damageEvents))
	for _, event := range w.damageEvents {
		damageEvents = append(damageEvents, map[string]interface{}{
			"targetID": event.TargetID,
			"damage":   event.Damage,
			"type":     string(event.Type),
		})
	}

	deathEvents := make([]map[string]interface{}, 0, len(w.deathEvents))
	for _, event := range w.deathEvents {
		deathEvents = append(deathEvents, map[string]interface{}{
			"entityID":   event.EntityID,
			"entityType": event.EntityType,
			"killerID":   event.KillerID,
		})
	}

	return map[string]interface{}{
		"players":      players,
		"enemies":      enemies,
		"projectiles":  projectiles,
		"damageEvents": damageEvents,
		"deathEvents":  deathEvents,
	}
}
