package game

import (
	"math"
	"math/rand"
)

// CharacterMood represents the character's emotional state
type CharacterMood string

const (
	MoodNeutral    CharacterMood = "neutral"
	MoodConfident  CharacterMood = "confident"
	MoodAnxious    CharacterMood = "anxious"
	MoodFrustrated CharacterMood = "frustrated"
	MoodRefusing   CharacterMood = "refusing"
)

// AIAction represents what the character AI decided to do
type AIAction struct {
	Type      string  // "ability", "dodge", "idle", "retreat"
	Ability   AbilityType
	TargetID  string
	Direction Vector3
	Mood      CharacterMood
	Dialogue  string // Short phrase the character says
}

// CharacterAI handles autonomous combat decisions for a player's character.
// The player controls movement/strategy; the character handles combat execution.
type CharacterAI struct {
	// Trust: 0-100. High trust = character follows player strategy more willingly.
	Trust float64

	// Mood affects combat performance and dialogue
	Mood CharacterMood

	// Combat preferences (personality)
	Aggression  float64 // 0-1: low = cautious/kiting, high = aggressive melee
	Preference  AbilityType // Preferred ability type

	// Priority target hint from player
	PriorityTargetID string

	// Internal state
	lastDecisionAge float64 // seconds since last decision
	decisionRate    float64 // how often to make decisions (seconds)
	consecutiveBadCalls int // how many times player sent them into danger
}

// NewCharacterAI creates a new character AI with default personality
func NewCharacterAI() *CharacterAI {
	return &CharacterAI{
		Trust:        75.0, // Start with decent trust
		Mood:         MoodNeutral,
		Aggression:   0.5,
		Preference:   AbilityFireball,
		decisionRate: 0.5, // Decide every 0.5 seconds
	}
}

// Update runs one AI tick. Returns an action if the character wants to do something.
func (ai *CharacterAI) Update(delta float64, player *Player, enemies map[string]*Enemy) *AIAction {
	ai.lastDecisionAge += delta
	if ai.lastDecisionAge < ai.decisionRate {
		return nil
	}
	ai.lastDecisionAge = 0

	// No enemies nearby? Stay idle, mood tends toward neutral
	if len(enemies) == 0 {
		ai.tendMood(MoodNeutral, 0.1)
		return nil
	}

	// Find best target
	target := ai.selectTarget(player, enemies)
	if target == nil {
		return nil
	}

	// Evaluate threat level
	threatLevel := ai.evaluateThreat(player, enemies)

	// Check if character wants to refuse (low trust + high threat)
	if ai.Trust < 20 && threatLevel > 0.8 {
		ai.Mood = MoodRefusing
		return &AIAction{
			Type:     "idle",
			Mood:     MoodRefusing,
			Dialogue: "I'm not doing that.",
		}
	}

	// Anxious at high threat
	if threatLevel > 0.6 {
		ai.tendMood(MoodAnxious, 0.2)
	}

	// Choose ability
	ability := ai.chooseAbility(player, target)
	if ability == nil {
		return nil
	}

	// Calculate direction to target
	dir := Vector3{
		X: target.Position.X - player.Position.X,
		Z: target.Position.Z - player.Position.Z,
	}
	dist := math.Sqrt(dir.X*dir.X + dir.Z*dir.Z)
	if dist > 0.001 {
		dir.X /= dist
		dir.Z /= dist
	}

	// Should we dodge instead? (low health + nearby melee threat)
	if player.Health/player.MaxHealth < 0.3 && dist < 3.0 && rand.Float64() < 0.4 {
		// Dodge away from threat
		ai.tendMood(MoodAnxious, 0.3)
		return &AIAction{
			Type:      "dodge",
			Direction: Vector3{X: -dir.X, Z: -dir.Z},
			Mood:      ai.Mood,
			Dialogue:  "Too close!",
		}
	}

	// Confident when doing well
	if player.Health/player.MaxHealth > 0.7 && threatLevel < 0.3 {
		ai.tendMood(MoodConfident, 0.1)
	}

	// Pick a dialogue line based on mood
	dialogue := ai.pickDialogue(ability.Type, ai.Mood)

	return &AIAction{
		Type:      "ability",
		Ability:   ability.Type,
		TargetID:  target.ID,
		Direction: dir,
		Mood:      ai.Mood,
		Dialogue:  dialogue,
	}
}

// selectTarget picks the best enemy to attack
func (ai *CharacterAI) selectTarget(player *Player, enemies map[string]*Enemy) *Enemy {
	// If player set a priority target that's still alive, prefer it
	if ai.PriorityTargetID != "" {
		if e, ok := enemies[ai.PriorityTargetID]; ok && !e.IsDead() {
			return e
		}
		ai.PriorityTargetID = "" // Target gone, clear hint
	}

	var best *Enemy
	bestScore := -1.0

	for _, enemy := range enemies {
		if enemy.IsDead() {
			continue
		}

		dist := Distance2D(player.Position, enemy.Position)
		if dist > 30 { // Too far to consider
			continue
		}

		// Score: prefer close + low health enemies
		healthPct := enemy.Health / enemy.MaxHealth
		score := (30 - dist) / 30.0 // Closer = higher score
		score += (1 - healthPct) * 0.5 // Lower health = higher score

		// Aggressive characters prefer close targets more
		score += ai.Aggression * (10 - math.Min(dist, 10)) / 10.0

		if score > bestScore {
			bestScore = score
			best = enemy
		}
	}

	return best
}

// evaluateThreat returns 0-1 threat level based on nearby enemies and player health
func (ai *CharacterAI) evaluateThreat(player *Player, enemies map[string]*Enemy) float64 {
	healthPct := player.Health / player.MaxHealth
	nearbyCount := 0

	for _, enemy := range enemies {
		if enemy.IsDead() {
			continue
		}
		dist := Distance2D(player.Position, enemy.Position)
		if dist < 10 {
			nearbyCount++
		}
	}

	// Threat scales with enemy count and inverse health
	threatFromEnemies := math.Min(float64(nearbyCount)/5.0, 1.0)
	threatFromHealth := 1.0 - healthPct

	return math.Min(threatFromEnemies*0.6+threatFromHealth*0.4, 1.0)
}

// chooseAbility selects the best ability to use
func (ai *CharacterAI) chooseAbility(player *Player, target *Enemy) *Ability {
	dist := Distance2D(player.Position, target.Position)

	// Try abilities in priority order based on range and preference
	abilityOrder := []AbilityType{ai.Preference, AbilityFireball, AbilityFrostbolt, AbilityLightning, AbilityBasicAttack}
	seen := make(map[AbilityType]bool)

	for _, aType := range abilityOrder {
		if seen[aType] {
			continue
		}
		seen[aType] = true

		if !player.Abilities.CanUseAbility(aType) {
			continue
		}

		ability := player.Abilities.abilities[aType]
		if ability == nil {
			continue
		}

		// Check range
		if dist > ability.Range*1.2 { // 20% tolerance
			continue
		}

		// Trust affects willingness to use abilities
		// Low trust: only use safe ranged abilities
		if ai.Trust < 30 && ability.Category == AbilityCategoryMelee {
			continue
		}

		return ability
	}

	return nil
}

// tendMood gradually shifts mood toward a target mood
func (ai *CharacterAI) tendMood(target CharacterMood, strength float64) {
	// Simple: just set it if strength is high enough
	if strength > 0.2 || ai.Mood == MoodNeutral {
		ai.Mood = target
	}
}

// AdjustTrust modifies trust based on outcomes
func (ai *CharacterAI) AdjustTrust(delta float64) {
	ai.Trust = math.Max(0, math.Min(100, ai.Trust+delta))

	// Update mood based on trust
	if ai.Trust < 20 {
		ai.Mood = MoodFrustrated
	} else if ai.Trust > 80 {
		ai.tendMood(MoodConfident, 0.1)
	}
}

// RecordPlayerDecision tracks whether the player's strategic call was good or bad.
// outcome > 0 means good (killed enemies, avoided damage), < 0 means bad (took lots of damage)
func (ai *CharacterAI) RecordPlayerDecision(outcome float64) {
	if outcome > 0 {
		ai.AdjustTrust(outcome * 2)
		ai.consecutiveBadCalls = 0
	} else {
		ai.AdjustTrust(outcome * 3) // Bad calls erode trust faster
		ai.consecutiveBadCalls++
	}
}

// pickDialogue returns a short phrase based on mood and action
func (ai *CharacterAI) pickDialogue(ability AbilityType, mood CharacterMood) string {
	switch mood {
	case MoodConfident:
		switch ability {
		case AbilityFireball:
			return "Burn!"
		case AbilityFrostbolt:
			return "Freeze!"
		case AbilityLightning:
			return "Shocking."
		default:
			return "Easy."
		}
	case MoodAnxious:
		return "Careful..."
	case MoodFrustrated:
		return "Fine."
	case MoodRefusing:
		return "No."
	default:
		return ""
	}
}

// Serialize returns the character AI state for network transmission
func (ai *CharacterAI) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"trust":    ai.Trust,
		"mood":     string(ai.Mood),
		"dialogue": ai.pickDialogue("", ai.Mood),
	}
}
