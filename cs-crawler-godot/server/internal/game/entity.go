package game

import "time"

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

	// State
	LastUpdate time.Time
}

// NewPlayer creates a new player
func NewPlayer(id, username string) *Player {
	return &Player{
		ID:         id,
		Username:   username,
		Position:   Vector3{X: 0, Y: 0, Z: 0},
		Velocity:   Vector3{X: 0, Y: 0, Z: 0},
		Health:     100,
		MaxHealth:  100,
		MoveSpeed:  5.0,
		LastUpdate: time.Now(),
	}
}

// Update processes player logic
func (p *Player) Update(delta float64) {
	// Update position based on velocity
	p.Position.X += p.Velocity.X * delta
	p.Position.Y += p.Velocity.Y * delta
	p.Position.Z += p.Velocity.Z * delta

	p.LastUpdate = time.Now()
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
	ID       string
	Type     string
	Position Vector3
	Velocity Vector3
	Health   float64
	MaxHealth float64

	LastUpdate time.Time
}

// Update processes enemy AI and movement
func (e *Enemy) Update(delta float64) {
	// TODO: Implement AI logic
	e.LastUpdate = time.Now()
}

// Serialize converts enemy to JSON-friendly format
func (e *Enemy) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":       e.ID,
		"type":     e.Type,
		"position": e.Position,
		"health":   e.Health,
	}
}

// Projectile represents a projectile entity
type Projectile struct {
	ID         string
	OwnerID    string
	Position   Vector3
	Velocity   Vector3
	Damage     float64
	CreatedAt  time.Time
	Lifetime   float64
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
		"id":       p.ID,
		"position": p.Position,
		"velocity": p.Velocity,
	}
}
