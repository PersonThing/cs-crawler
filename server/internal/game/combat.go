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

// AbilityCastEvent represents an ability cast by a minion to broadcast
type AbilityCastEvent struct {
	CasterID     string  // Minion ID
	CasterType   string  // "pet" or "turret"
	OwnerID      string  // Player who owns the minion
	AbilityType  string  // Type of ability
	Position     Vector3 // Cast position
	Direction    Vector3 // Cast direction
	HitTargets   []string // IDs of enemies hit (for instant/melee)
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

// Normalize2D normalizes a 2D vector (X,Z plane)
func Normalize2D(v Vector3) Vector3 {
	length := math.Sqrt(v.X*v.X + v.Z*v.Z)
	if length == 0 {
		return v
	}
	return Vector3{X: v.X / length, Y: v.Y, Z: v.Z / length}
}

// Dot2D calculates the dot product of two 2D vectors (X,Z plane)
func Dot2D(a, b Vector3) float64 {
	return a.X*b.X + a.Z*b.Z
}

// CheckLineCollision checks if an enemy is hit by a line-based ability (like Lightning)
// Returns true if the enemy is within range and close to the line
func CheckLineCollision(origin, direction Vector3, maxRange, lineWidth float64, enemy *Enemy) bool {
	if enemy.IsDead() {
		return false
	}

	// Vector from origin to enemy
	toEnemy := Vector3{
		X: enemy.Position.X - origin.X,
		Y: 0,
		Z: enemy.Position.Z - origin.Z,
	}

	// Normalize direction (2D)
	dir := Normalize2D(direction)

	// Distance along the direction
	distanceAlong := Dot2D(toEnemy, dir)

	// Check if enemy is within range
	if distanceAlong < 0 || distanceAlong > maxRange {
		return false
	}

	// Calculate perpendicular distance from line
	projectedPoint := Vector3{
		X: origin.X + dir.X*distanceAlong,
		Y: 0,
		Z: origin.Z + dir.Z*distanceAlong,
	}

	perpDistance := Distance2D(enemy.Position, projectedPoint)

	// Check if within line width
	return perpDistance <= lineWidth
}

// CheckConeCollision checks if an enemy is hit by a cone-based ability (like BasicAttack)
// Returns true if the enemy is within range and within the cone angle
func CheckConeCollision(origin, direction Vector3, maxRange, coneAngleDegrees float64, enemy *Enemy) bool {
	if enemy.IsDead() {
		return false
	}

	// Vector from origin to enemy
	toEnemy := Vector3{
		X: enemy.Position.X - origin.X,
		Y: 0,
		Z: enemy.Position.Z - origin.Z,
	}

	// Check if enemy is within range
	distance := math.Sqrt(toEnemy.X*toEnemy.X + toEnemy.Z*toEnemy.Z)
	if distance > maxRange {
		return false
	}

	// Normalize both vectors
	dir := Normalize2D(direction)
	toEnemyNorm := Normalize2D(toEnemy)

	// Calculate angle between direction and toEnemy
	dotProduct := Dot2D(dir, toEnemyNorm)

	// Convert cone angle to radians and calculate half angle
	halfAngleRad := (coneAngleDegrees / 2.0) * (math.Pi / 180.0)
	cosHalfAngle := math.Cos(halfAngleRad)

	// Check if enemy is within cone
	return dotProduct >= cosHalfAngle
}
