package game

import (
	"time"
)

// MinionType represents the type of minion
type MinionType string

const (
	MinionTypePet    MinionType = "pet"
	MinionTypeTurret MinionType = "turret"
)

// Minion represents a summoned entity (Pet or Turret)
type Minion struct {
	ID           string
	OwnerID      string
	Type         MinionType
	Position     Vector3
	Velocity     Vector3
	AbilityType  AbilityType // The ability this minion casts
	Ability      *Ability    // Reference to the ability data
	CreatedAt    time.Time
	Lifetime     float64 // Duration in seconds
	CastInterval float64 // Time between casts
	LastCast     time.Time

	// Pet specific
	FollowSpeed  float64 // Movement speed for pets
	FollowRange  float64 // How close to stay to owner
}

// NewPet creates a new pet minion
func NewPet(id, ownerID string, position Vector3, ability *Ability, abilityType AbilityType, modifier *Modifier) *Minion {
	return &Minion{
		ID:           id,
		OwnerID:      ownerID,
		Type:         MinionTypePet,
		Position:     position,
		Velocity:     Vector3{X: 0, Y: 0, Z: 0},
		AbilityType:  abilityType,
		Ability:      ability,
		CreatedAt:    time.Now(),
		Lifetime:     modifier.MinionDuration,
		CastInterval: modifier.CastInterval,
		LastCast:     time.Now(),
		FollowSpeed:  3.0, // Slightly slower than player
		FollowRange:  3.0, // Stay within 3 units of owner
	}
}

// NewTurret creates a new turret minion
func NewTurret(id, ownerID string, position Vector3, ability *Ability, abilityType AbilityType, modifier *Modifier) *Minion {
	return &Minion{
		ID:           id,
		OwnerID:      ownerID,
		Type:         MinionTypeTurret,
		Position:     position,
		Velocity:     Vector3{X: 0, Y: 0, Z: 0},
		AbilityType:  abilityType,
		Ability:      ability,
		CreatedAt:    time.Now(),
		Lifetime:     modifier.MinionDuration,
		CastInterval: modifier.CastInterval,
		LastCast:     time.Now(),
		FollowSpeed:  0, // Turrets don't move
		FollowRange:  0,
	}
}

// Update updates the minion (movement for pets)
func (m *Minion) Update(delta float64, ownerPosition Vector3) {
	if m.Type == MinionTypePet {
		// Calculate distance to owner
		dx := ownerPosition.X - m.Position.X
		dz := ownerPosition.Z - m.Position.Z
		distance := Distance2D(m.Position, ownerPosition)

		// If too far from owner, move towards them
		if distance > m.FollowRange {
			// Normalize and apply speed
			if distance > 0 {
				m.Velocity.X = (dx / distance) * m.FollowSpeed
				m.Velocity.Z = (dz / distance) * m.FollowSpeed

				// Update position
				m.Position.X += m.Velocity.X * delta
				m.Position.Z += m.Velocity.Z * delta
			}
		} else {
			// Within range, stop moving
			m.Velocity.X = 0
			m.Velocity.Z = 0
		}
	}
	// Turrets don't move, so no update needed
}

// CanCast checks if the minion can cast its ability
func (m *Minion) CanCast() bool {
	return time.Since(m.LastCast).Seconds() >= m.CastInterval
}

// MarkCasted marks that the minion has just casted
func (m *Minion) MarkCasted() {
	m.LastCast = time.Now()
}

// ShouldDestroy returns true if the minion should be removed
func (m *Minion) ShouldDestroy() bool {
	return time.Since(m.CreatedAt).Seconds() > m.Lifetime
}

// FindNearestEnemy finds the nearest enemy to the minion within range
func (m *Minion) FindNearestEnemy(enemies map[string]*Enemy, maxRange float64) *Enemy {
	var nearest *Enemy
	minDistance := maxRange

	for _, enemy := range enemies {
		if enemy.IsDead() {
			continue
		}

		distance := Distance2D(m.Position, enemy.Position)
		if distance < minDistance {
			minDistance = distance
			nearest = enemy
		}
	}

	return nearest
}

// GetDirectionTo returns a normalized direction vector to a target position
func (m *Minion) GetDirectionTo(target Vector3) Vector3 {
	direction := Vector3{
		X: target.X - m.Position.X,
		Y: 0,
		Z: target.Z - m.Position.Z,
	}
	return Normalize2D(direction)
}

// Serialize converts minion to JSON-friendly format
func (m *Minion) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":          m.ID,
		"ownerID":     m.OwnerID,
		"type":        string(m.Type),
		"position":    m.Position,
		"velocity":    m.Velocity,
		"abilityType": string(m.AbilityType),
	}
}
