package game

import (
	"fmt"
	"log"
	"time"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
)

// AbilityType represents different ability types
type AbilityType string

const (
	AbilityFireball     AbilityType = "fireball"
	AbilityFrostbolt    AbilityType = "frostbolt"
	AbilityLightning    AbilityType = "lightning"
	AbilityBasicAttack  AbilityType = "basic_attack"
)

// Ability defines the structure of an ability
type Ability struct {
	Type       AbilityType
	Name       string
	Cooldown   float64    // Cooldown in seconds
	Damage     float64
	DamageType DamageType
	Range      float64
	Speed      float64 // For projectiles
	Lifetime   float64 // For projectiles
	Radius     float64 // Collision radius
}

// AbilityManager manages ability cooldowns for a player
type AbilityManager struct {
	abilities      map[AbilityType]*Ability
	lastUsed       map[AbilityType]time.Time
}

// NewAbilityManager creates a new ability manager
func NewAbilityManager() *AbilityManager {
	am := &AbilityManager{
		abilities: make(map[AbilityType]*Ability),
		lastUsed:  make(map[AbilityType]time.Time),
	}

	// Initialize default abilities
	am.RegisterAbility(GetFireballAbility())

	return am
}

// RegisterAbility adds an ability to the manager
func (am *AbilityManager) RegisterAbility(ability *Ability) {
	am.abilities[ability.Type] = ability
}

// CanUseAbility checks if an ability is off cooldown
func (am *AbilityManager) CanUseAbility(abilityType AbilityType) bool {
	ability, exists := am.abilities[abilityType]
	if !exists {
		return false
	}

	lastUse, used := am.lastUsed[abilityType]
	if !used {
		return true
	}

	return time.Since(lastUse).Seconds() >= ability.Cooldown
}

// UseAbility marks an ability as used and returns the ability data
func (am *AbilityManager) UseAbility(abilityType AbilityType) (*Ability, error) {
	if !am.CanUseAbility(abilityType) {
		return nil, fmt.Errorf("ability on cooldown")
	}

	ability := am.abilities[abilityType]
	am.lastUsed[abilityType] = time.Now()
	return ability, nil
}

// GetRemainingCooldown returns the remaining cooldown for an ability
func (am *AbilityManager) GetRemainingCooldown(abilityType AbilityType) float64 {
	ability, exists := am.abilities[abilityType]
	if !exists {
		return 0
	}

	lastUse, used := am.lastUsed[abilityType]
	if !used {
		return 0
	}

	elapsed := time.Since(lastUse).Seconds()
	remaining := ability.Cooldown - elapsed
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetFireballAbility returns the Fireball ability definition
func GetFireballAbility() *Ability {
	// Try to load from config
	cfg, ok := config.GetAbilityConfig("fireball")
	if !ok {
		log.Println("[ABILITY] Fireball config not found, using defaults")
		return getDefaultFireball()
	}

	return &Ability{
		Type:       AbilityFireball,
		Name:       cfg.Name,
		Cooldown:   cfg.Cooldown,
		Damage:     cfg.Damage,
		DamageType: parseDamageType(cfg.DamageType),
		Range:      cfg.Range,
		Speed:      cfg.Speed,
		Lifetime:   cfg.Lifetime,
		Radius:     cfg.CollisionRadius,
	}
}

// getDefaultFireball returns hardcoded defaults as fallback
func getDefaultFireball() *Ability {
	return &Ability{
		Type:       AbilityFireball,
		Name:       "Fireball",
		Cooldown:   0.5,
		Damage:     25.0,
		DamageType: DamageTypeFire,
		Range:      30.0,
		Speed:      15.0,
		Lifetime:   5.0,
		Radius:     0.5,
	}
}

// parseDamageType converts string to DamageType
func parseDamageType(dt string) DamageType {
	switch dt {
	case "fire":
		return DamageTypeFire
	case "cold":
		return DamageTypeCold
	case "lightning":
		return DamageTypeLightning
	case "physical":
		return DamageTypePhysical
	default:
		return DamageTypePhysical
	}
}

// Serialize converts ability to JSON-friendly format
func (a *Ability) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"type":       string(a.Type),
		"name":       a.Name,
		"cooldown":   a.Cooldown,
		"damage":     a.Damage,
		"damageType": string(a.DamageType),
		"range":      a.Range,
	}
}
