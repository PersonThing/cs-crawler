package game

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

// StateSnapshot holds all the information the character AI needs to make a decision.
// Light radius filters what the character can perceive.
type StateSnapshot struct {
	// Character state
	HealthPct     float64
	ManaPct       float64 // future use
	Position      Vector3
	LightRadius   float64
	InDungeon     bool

	// Abilities and cooldowns
	Abilities []AbilitySnapshot

	// Nearby entities (filtered by light radius in dungeons)
	Enemies []EnemySnapshot

	// Personality and trust
	Trust      float64
	Mood       CharacterMood
	Aggression float64

	// Player hints
	PriorityTargetID string
}

// AbilitySnapshot is a compact view of an ability for the prompt.
type AbilitySnapshot struct {
	Type     string
	Category string
	Ready    bool
	Damage   float64
	Range    float64
}

// EnemySnapshot is a compact view of an enemy for the prompt.
type EnemySnapshot struct {
	ID        string
	Type      string
	Distance  float64
	HealthPct float64
	Angle     float64 // degrees from player facing direction
}

// BuildStateSnapshot creates a snapshot of the game state for a player,
// filtering enemies by light radius when in a dungeon.
func BuildStateSnapshot(player *Player, enemies map[string]*Enemy) *StateSnapshot {
	snap := &StateSnapshot{
		HealthPct:   player.Health / player.MaxHealth,
		Position:    player.Position,
		LightRadius: player.LightRadius,
		InDungeon:   layerFromY(player.Position.Y) < 0,
		Trust:       75.0,
		Mood:        MoodNeutral,
		Aggression:  0.5,
	}

	if player.CharAI != nil {
		snap.Trust = player.CharAI.Trust
		snap.Mood = player.CharAI.Mood
		snap.Aggression = player.CharAI.Aggression
		snap.PriorityTargetID = player.CharAI.PriorityTargetID
	}

	// Serialize abilities
	if player.Abilities != nil {
		for aType, ability := range player.Abilities.abilities {
			snap.Abilities = append(snap.Abilities, AbilitySnapshot{
				Type:     string(aType),
				Category: string(ability.Category),
				Ready:    player.Abilities.CanUseAbility(aType),
				Damage:   ability.Damage,
				Range:    ability.Range,
			})
		}
		// Sort for deterministic prompt output
		sort.Slice(snap.Abilities, func(i, j int) bool {
			return snap.Abilities[i].Type < snap.Abilities[j].Type
		})
	}

	// Serialize enemies, filtered by light radius in dungeons
	for _, enemy := range enemies {
		if enemy.IsDead() {
			continue
		}
		dist := Distance2D(player.Position, enemy.Position)

		// Light radius filtering: in dungeons, can only perceive enemies within light radius
		if snap.InDungeon && dist > snap.LightRadius {
			continue
		}

		// Cap at reasonable perception distance on overworld too
		if dist > 30 {
			continue
		}

		// Calculate angle from player's facing direction
		dx := enemy.Position.X - player.Position.X
		dz := enemy.Position.Z - player.Position.Z
		angle := math.Atan2(dz, dx) * (180.0 / math.Pi)

		snap.Enemies = append(snap.Enemies, EnemySnapshot{
			ID:        enemy.ID,
			Type:      enemy.Type,
			Distance:  math.Round(dist*10) / 10, // 1 decimal
			HealthPct: math.Round(enemy.Health/enemy.MaxHealth*100) / 100,
			Angle:     math.Round(angle),
		})
	}

	// Sort enemies by distance (closest first), limit to 8 for prompt brevity
	sort.Slice(snap.Enemies, func(i, j int) bool {
		return snap.Enemies[i].Distance < snap.Enemies[j].Distance
	})
	if len(snap.Enemies) > 8 {
		snap.Enemies = snap.Enemies[:8]
	}

	return snap
}

// ToPrompt serializes the state snapshot to a compact text prompt (~150-200 tokens).
func (s *StateSnapshot) ToPrompt() string {
	var b strings.Builder

	// System context
	b.WriteString("You are a combat AI for an ARPG character. Respond with a single JSON action.\n")

	// Character state
	fmt.Fprintf(&b, "HP:%.0f%% ", s.HealthPct*100)
	if s.InDungeon {
		fmt.Fprintf(&b, "DUNGEON light:%.0f ", s.LightRadius)
	}
	fmt.Fprintf(&b, "trust:%.0f mood:%s aggro:%.1f\n", s.Trust, s.Mood, s.Aggression)

	// Abilities
	b.WriteString("Abilities: ")
	for i, a := range s.Abilities {
		if i > 0 {
			b.WriteString(", ")
		}
		ready := "READY"
		if !a.Ready {
			ready = "CD"
		}
		fmt.Fprintf(&b, "%s(%s dmg:%.0f rng:%.0f %s)", a.Type, a.Category, a.Damage, a.Range, ready)
	}
	b.WriteString("\n")

	// Enemies
	if len(s.Enemies) == 0 {
		b.WriteString("No enemies visible.\n")
	} else {
		b.WriteString("Enemies:\n")
		for _, e := range s.Enemies {
			marker := ""
			if e.ID == s.PriorityTargetID {
				marker = " [PRIORITY]"
			}
			fmt.Fprintf(&b, "- %s dist:%.1f hp:%.0f%% ang:%.0f%s\n",
				e.Type, e.Distance, e.HealthPct*100, e.Angle, marker)
		}
	}

	// Instructions
	b.WriteString("Choose action JSON: {action, mood, reason")
	if len(s.Enemies) > 0 {
		b.WriteString(", ability?, target?, direction?")
	}
	b.WriteString("}\n")

	return b.String()
}
