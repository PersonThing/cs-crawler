package game

import (
	"fmt"
	"log"
	"time"

	"github.com/PersonThing/cs-crawler/server/internal/config"
)

// AbilityType represents different ability types
type AbilityType string

const (
	AbilityFireball    AbilityType = "fireball"
	AbilityFrostbolt   AbilityType = "frostbolt"
	AbilityLightning   AbilityType = "lightning"
	AbilityBasicAttack AbilityType = "basic_attack"
)

// AbilityCategory represents the category of ability (projectile, instant, melee)
type AbilityCategory string

const (
	AbilityCategoryProjectile AbilityCategory = "projectile"
	AbilityCategoryInstant    AbilityCategory = "instant"
	AbilityCategoryMelee      AbilityCategory = "melee"
)

// Ability defines the structure of an ability
type Ability struct {
	Type         AbilityType
	Name         string
	Category     AbilityCategory // projectile, instant, or melee
	Cooldown     float64         // Cooldown in seconds
	Damage       float64
	DamageType   DamageType
	Range        float64
	Speed        float64           // For projectiles
	Lifetime     float64           // For projectiles
	Radius       float64           // Collision radius
	Angle        float64           // For cone/melee attacks (in degrees)
	StatusEffect *StatusEffectInfo // Optional status effect to apply
}

// AbilityManager manages ability cooldowns for a player
type AbilityManager struct {
	abilities map[AbilityType]*Ability
	lastUsed  map[AbilityType]time.Time
}

// NewAbilityManager creates a new ability manager
func NewAbilityManager() *AbilityManager {
	am := &AbilityManager{
		abilities: make(map[AbilityType]*Ability),
		lastUsed:  make(map[AbilityType]time.Time),
	}

	// Initialize all abilities
	am.RegisterAbility(GetFireballAbility())
	am.RegisterAbility(GetFrostboltAbility())
	am.RegisterAbility(GetLightningAbility())
	am.RegisterAbility(GetBasicAttackAbility())

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
		Type:         AbilityFireball,
		Name:         cfg.Name,
		Category:     AbilityCategoryProjectile,
		Cooldown:     cfg.Cooldown,
		Damage:       cfg.Damage,
		DamageType:   parseDamageType(cfg.DamageType),
		Range:        cfg.Range,
		Speed:        cfg.Speed,
		Lifetime:     cfg.Lifetime,
		Radius:       cfg.CollisionRadius,
		Angle:        0,
		StatusEffect: nil,
	}
}

// GetFrostboltAbility returns the Frostbolt ability definition
func GetFrostboltAbility() *Ability {
	// Try to load from config
	cfg, ok := config.GetAbilityConfig("frostbolt")
	if !ok {
		log.Println("[ABILITY] Frostbolt config not found, using defaults")
		return getDefaultFrostbolt()
	}

	// Parse status effect if present
	var statusEffect *StatusEffectInfo
	if cfg.StatusEffect != nil {
		statusEffect = ParseStatusEffectInfo(cfg.StatusEffect)
	}

	return &Ability{
		Type:         AbilityFrostbolt,
		Name:         cfg.Name,
		Category:     AbilityCategoryProjectile,
		Cooldown:     cfg.Cooldown,
		Damage:       cfg.Damage,
		DamageType:   parseDamageType(cfg.DamageType),
		Range:        cfg.Range,
		Speed:        cfg.Speed,
		Lifetime:     cfg.Lifetime,
		Radius:       cfg.CollisionRadius,
		Angle:        0,
		StatusEffect: statusEffect,
	}
}

// GetLightningAbility returns the Lightning ability definition
func GetLightningAbility() *Ability {
	// Try to load from config
	cfg, ok := config.GetAbilityConfig("lightning")
	if !ok {
		log.Println("[ABILITY] Lightning config not found, using defaults")
		return getDefaultLightning()
	}

	return &Ability{
		Type:         AbilityLightning,
		Name:         cfg.Name,
		Category:     AbilityCategoryInstant,
		Cooldown:     cfg.Cooldown,
		Damage:       cfg.Damage,
		DamageType:   parseDamageType(cfg.DamageType),
		Range:        cfg.Range,
		Speed:        0,
		Lifetime:     0,
		Radius:       0.5, // Width of the line
		Angle:        0,
		StatusEffect: nil,
	}
}

// GetBasicAttackAbility returns the Basic Attack ability definition
func GetBasicAttackAbility() *Ability {
	// Try to load from config
	cfg, ok := config.GetAbilityConfig("basic_attack")
	if !ok {
		log.Println("[ABILITY] Basic Attack config not found, using defaults")
		return getDefaultBasicAttack()
	}

	angle := 90.0 // Default cone angle
	if cfg.Angle > 0 {
		angle = cfg.Angle
	}

	return &Ability{
		Type:         AbilityBasicAttack,
		Name:         cfg.Name,
		Category:     AbilityCategoryMelee,
		Cooldown:     cfg.Cooldown,
		Damage:       cfg.Damage,
		DamageType:   parseDamageType(cfg.DamageType),
		Range:        cfg.Range,
		Speed:        0,
		Lifetime:     0,
		Radius:       0,
		Angle:        angle,
		StatusEffect: nil,
	}
}

// getDefaultFireball returns hardcoded defaults as fallback
func getDefaultFireball() *Ability {
	return &Ability{
		Type:         AbilityFireball,
		Name:         "Fireball",
		Category:     AbilityCategoryProjectile,
		Cooldown:     0.5,
		Damage:       25.0,
		DamageType:   DamageTypeFire,
		Range:        30.0,
		Speed:        15.0,
		Lifetime:     5.0,
		Radius:       0.5,
		Angle:        0,
		StatusEffect: nil,
	}
}

// getDefaultFrostbolt returns hardcoded defaults as fallback
func getDefaultFrostbolt() *Ability {
	return &Ability{
		Type:       AbilityFrostbolt,
		Name:       "Frostbolt",
		Category:   AbilityCategoryProjectile,
		Cooldown:   0.8,
		Damage:     20.0,
		DamageType: DamageTypeCold,
		Range:      30.0,
		Speed:      12.0,
		Lifetime:   5.0,
		Radius:     0.5,
		Angle:      0,
		StatusEffect: &StatusEffectInfo{
			Type:      StatusEffectSlow,
			Duration:  2.0,
			Magnitude: 0.5,
		},
	}
}

// getDefaultLightning returns hardcoded defaults as fallback
func getDefaultLightning() *Ability {
	return &Ability{
		Type:         AbilityLightning,
		Name:         "Lightning",
		Category:     AbilityCategoryInstant,
		Cooldown:     1.0,
		Damage:       30.0,
		DamageType:   DamageTypeLightning,
		Range:        20.0,
		Speed:        0,
		Lifetime:     0,
		Radius:       0.5,
		Angle:        0,
		StatusEffect: nil,
	}
}

// getDefaultBasicAttack returns hardcoded defaults as fallback
func getDefaultBasicAttack() *Ability {
	return &Ability{
		Type:         AbilityBasicAttack,
		Name:         "Basic Attack",
		Category:     AbilityCategoryMelee,
		Cooldown:     0.3,
		Damage:       15.0,
		DamageType:   DamageTypePhysical,
		Range:        2.0,
		Speed:        0,
		Lifetime:     0,
		Radius:       0,
		Angle:        90.0,
		StatusEffect: nil,
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
