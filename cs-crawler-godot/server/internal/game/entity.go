package game

import (
	"log"
	"time"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
)

// Vector3 represents a 3D position or velocity
type Vector3 struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// Player represents a player character
type Player struct {
	ID       string
	Username string
	Position Vector3
	Velocity Vector3
	Health   float64
	MaxHealth float64

	// Stats
	MoveSpeed float64

	// Abilities
	Abilities *AbilityManager

	// State
	LastUpdate time.Time
}

// NewPlayer creates a new player
func NewPlayer(id, username string) *Player {
	// Load player stats from config
	stats := config.Player.BaseStats

	return &Player{
		ID:         id,
		Username:   username,
		Position:   Vector3{X: 0, Y: 0, Z: 0},
		Velocity:   Vector3{X: 0, Y: 0, Z: 0},
		Health:     stats.Health,
		MaxHealth:  stats.MaxHealth,
		MoveSpeed:  stats.MoveSpeed,
		Abilities:  NewAbilityManager(),
		LastUpdate: time.Now(),
	}
}

// Update processes player logic
func (p *Player) Update(delta float64) {
	// Update position based on velocity and move speed
	p.Position.X += p.Velocity.X * p.MoveSpeed * delta
	p.Position.Y += p.Velocity.Y * p.MoveSpeed * delta
	p.Position.Z += p.Velocity.Z * p.MoveSpeed * delta

	p.LastUpdate = time.Now()
}

// SetVelocity updates player velocity (normalized by client)
func (p *Player) SetVelocity(v Vector3) {
	p.Velocity = v
}

// Serialize converts player to JSON-friendly format
func (p *Player) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":       p.ID,
		"username": p.Username,
		"position": p.Position,
		"velocity": p.Velocity,
		"health":   p.Health,
		"maxHealth": p.MaxHealth,
	}
}

// Enemy represents an enemy entity
type Enemy struct {
	ID         string
	Type       string
	Position   Vector3
	Velocity   Vector3
	Health     float64
	MaxHealth  float64
	Dead       bool

	LastUpdate time.Time
}

// NewEnemy creates a new enemy
func NewEnemy(id, enemyType string, position Vector3) *Enemy {
	// Load enemy config
	cfg, ok := config.GetEnemyConfig(enemyType)
	if !ok {
		log.Printf("[ENEMY] Config not found for type '%s', using defaults", enemyType)
		cfg = &config.EnemyConfig{
			Health:    100,
			MaxHealth: 100,
		}
	}

	return &Enemy{
		ID:         id,
		Type:       enemyType,
		Position:   position,
		Velocity:   Vector3{X: 0, Y: 0, Z: 0},
		Health:     cfg.Health,
		MaxHealth:  cfg.MaxHealth,
		Dead:       false,
		LastUpdate: time.Now(),
	}
}

// Update processes enemy AI and movement
func (e *Enemy) Update(delta float64) {
	// TODO: Implement AI logic
	e.LastUpdate = time.Now()
}

// TakeDamage applies damage to the enemy and returns true if it died
func (e *Enemy) TakeDamage(damage DamageInfo) bool {
	if e.Dead {
		return false
	}

	e.Health -= damage.Amount
	if e.Health <= 0 {
		e.Health = 0
		e.Dead = true
		return true
	}
	return false
}

// GetHealth returns current health
func (e *Enemy) GetHealth() float64 {
	return e.Health
}

// GetMaxHealth returns maximum health
func (e *Enemy) GetMaxHealth() float64 {
	return e.MaxHealth
}

// IsDead returns whether the enemy is dead
func (e *Enemy) IsDead() bool {
	return e.Dead
}

// Serialize converts enemy to JSON-friendly format
func (e *Enemy) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":        e.ID,
		"type":      e.Type,
		"position":  e.Position,
		"health":    e.Health,
		"maxHealth": e.MaxHealth,
		"dead":      e.Dead,
	}
}

// Projectile represents a projectile entity
type Projectile struct {
	ID          string
	OwnerID     string
	Position    Vector3
	Velocity    Vector3
	Damage      float64
	DamageType  DamageType
	Speed       float64
	Radius      float64
	CreatedAt   time.Time
	Lifetime    float64
	AbilityType string
}

// NewProjectile creates a new projectile
func NewProjectile(id, ownerID string, position, velocity Vector3, damage float64, damageType DamageType, abilityType string) *Projectile {
	return &Projectile{
		ID:          id,
		OwnerID:     ownerID,
		Position:    position,
		Velocity:    velocity,
		Damage:      damage,
		DamageType:  damageType,
		Speed:       15.0,
		Radius:      0.5,
		CreatedAt:   time.Now(),
		Lifetime:    5.0,
		AbilityType: abilityType,
	}
}

// Update processes projectile movement
func (p *Projectile) Update(delta float64) {
	p.Position.X += p.Velocity.X * delta
	p.Position.Y += p.Velocity.Y * delta
	p.Position.Z += p.Velocity.Z * delta
}

// ShouldDestroy returns true if projectile should be removed
func (p *Projectile) ShouldDestroy() bool {
	return time.Since(p.CreatedAt).Seconds() > p.Lifetime
}

// Serialize converts projectile to JSON-friendly format
func (p *Projectile) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":          p.ID,
		"ownerID":     p.OwnerID,
		"position":    p.Position,
		"velocity":    p.Velocity,
		"abilityType": p.AbilityType,
	}
}
