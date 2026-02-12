package game

import (
	"time"
)

// StatusEffectType represents different types of status effects
type StatusEffectType string

const (
	StatusEffectSlow StatusEffectType = "slow"
	StatusEffectStun StatusEffectType = "stun"
)

// StatusEffect represents an active status effect on an entity
type StatusEffect struct {
	Type       StatusEffectType
	Duration   float64   // Total duration in seconds
	Magnitude  float64   // Effect strength (0.0-1.0)
	AppliedAt  time.Time
	SourceID   string    // ID of entity that applied the effect
}

// NewStatusEffect creates a new status effect
func NewStatusEffect(effectType StatusEffectType, duration, magnitude float64, sourceID string) *StatusEffect {
	return &StatusEffect{
		Type:      effectType,
		Duration:  duration,
		Magnitude: magnitude,
		AppliedAt: time.Now(),
		SourceID:  sourceID,
	}
}

// IsExpired checks if the status effect has expired
func (se *StatusEffect) IsExpired() bool {
	return time.Since(se.AppliedAt).Seconds() >= se.Duration
}

// GetRemainingDuration returns the remaining duration in seconds
func (se *StatusEffect) GetRemainingDuration() float64 {
	elapsed := time.Since(se.AppliedAt).Seconds()
	remaining := se.Duration - elapsed
	if remaining < 0 {
		return 0
	}
	return remaining
}

// Serialize converts status effect to JSON-friendly format
func (se *StatusEffect) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"type":      string(se.Type),
		"duration":  se.Duration,
		"magnitude": se.Magnitude,
		"remaining": se.GetRemainingDuration(),
	}
}

// StatusEffectInfo contains status effect configuration from ability
type StatusEffectInfo struct {
	Type      StatusEffectType
	Duration  float64
	Magnitude float64
}

// ParseStatusEffectInfo creates a StatusEffectInfo from config data
func ParseStatusEffectInfo(data map[string]interface{}) *StatusEffectInfo {
	if data == nil {
		return nil
	}

	effectType := StatusEffectType("")
	if typeStr, ok := data["type"].(string); ok {
		switch typeStr {
		case "slow":
			effectType = StatusEffectSlow
		case "stun":
			effectType = StatusEffectStun
		}
	}

	duration := 0.0
	if dur, ok := data["duration"].(float64); ok {
		duration = dur
	}

	magnitude := 0.0
	if mag, ok := data["magnitude"].(float64); ok {
		magnitude = mag
	}

	if effectType == "" {
		return nil
	}

	return &StatusEffectInfo{
		Type:      effectType,
		Duration:  duration,
		Magnitude: magnitude,
	}
}
