package game

import (
	"math"
)

// DamageType represents different types of damage
type DamageType string

const (
	DamageTypeFire      DamageType = "fire"
	DamageTypeCold      DamageType = "cold"
	DamageTypeLightning DamageType = "lightning"
	DamageTypePhysical  DamageType = "physical"
)

// DamageInfo contains information about damage dealt
type DamageInfo struct {
	Amount     float64
	Type       DamageType
	SourceID   string // ID of entity that dealt damage
	TargetID   string // ID of entity that received damage
}

// DamageEvent represents a damage event to broadcast
type DamageEvent struct {
	TargetID string
	Damage   float64
	Type     DamageType
}

// DeathEvent represents an entity death to broadcast
type DeathEvent struct {
	EntityID   string
	EntityType string // "player" or "enemy"
	KillerID   string
}

// Damageable interface for entities that can take damage
type Damageable interface {
	TakeDamage(damage DamageInfo) bool // Returns true if entity died
	GetHealth() float64
	GetMaxHealth() float64
	IsDead() bool
}

// CalculateDamage computes final damage amount
func CalculateDamage(baseDamage float64, damageType DamageType) float64 {
	// TODO: Add damage modifiers, resistances, etc.
	return baseDamage
}

// Distance3D calculates distance between two 3D points
func Distance3D(a, b Vector3) float64 {
	dx := a.X - b.X
	dy := a.Y - b.Y
	dz := a.Z - b.Z
	return math.Sqrt(dx*dx + dy*dy + dz*dz)
}

// Distance2D calculates horizontal distance between two 3D points (ignoring Y)
func Distance2D(a, b Vector3) float64 {
	dx := a.X - b.X
	dz := a.Z - b.Z
	return math.Sqrt(dx*dx + dz*dz)
}

// CheckProjectileCollision checks if a projectile collides with any entities
// Uses 2D distance (X,Z plane) to allow projectiles at different heights to hit
func CheckProjectileCollision(projectile *Projectile, enemies map[string]*Enemy, radius float64) *Enemy {
	for _, enemy := range enemies {
		if enemy.IsDead() {
			continue
		}

		// Use 2D distance so projectiles at different Y heights can still hit
		distance := Distance2D(projectile.Position, enemy.Position)
		if distance <= radius {
			return enemy
		}
	}
	return nil
}

// ApplyDamage applies damage to an entity and returns true if it died
func ApplyDamage(target Damageable, damage DamageInfo) bool {
	finalDamage := CalculateDamage(damage.Amount, damage.Type)
	damage.Amount = finalDamage
	return target.TakeDamage(damage)
}
