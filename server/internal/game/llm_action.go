package game

import (
	"encoding/json"
	"fmt"
)

// LLMAction is the structured JSON output from the LLM character AI.
// The GBNF grammar constrains output to only valid instances of this schema.
type LLMAction struct {
	Action    string `json:"action"`              // "ability", "dodge", "retreat", "idle"
	Ability   string `json:"ability,omitempty"`    // ability type if action == "ability"
	Target    string `json:"target,omitempty"`     // "nearest", "lowest_hp", "priority", or enemy ID
	Direction string `json:"direction,omitempty"`  // "toward_target", "away_from_target", "left", "right"
	Mood      string `json:"mood"`                 // "neutral", "confident", "anxious", "frustrated", "refusing"
	Reason    string `json:"reason"`               // Short explanation for dialogue
}

// GBNF grammar that constrains LLM output to valid LLMAction JSON.
// This ensures the model can only produce parseable, game-valid output.
const ActionGBNF = `
root   ::= "{" ws action-kv "," ws mood-kv "," ws reason-kv extra-kvs "}" ws

action-kv ::= "\"action\"" ws ":" ws action-val
mood-kv   ::= "\"mood\"" ws ":" ws mood-val
reason-kv ::= "\"reason\"" ws ":" ws string

extra-kvs ::= "" | "," ws ability-kv | "," ws ability-kv "," ws target-kv | "," ws ability-kv "," ws target-kv "," ws direction-kv | "," ws direction-kv

ability-kv   ::= "\"ability\"" ws ":" ws ability-val
target-kv    ::= "\"target\"" ws ":" ws target-val
direction-kv ::= "\"direction\"" ws ":" ws direction-val

action-val    ::= "\"ability\"" | "\"dodge\"" | "\"retreat\"" | "\"idle\""
mood-val      ::= "\"neutral\"" | "\"confident\"" | "\"anxious\"" | "\"frustrated\"" | "\"refusing\""
ability-val   ::= "\"fireball\"" | "\"frostbolt\"" | "\"lightning\"" | "\"basic_attack\""
target-val    ::= "\"nearest\"" | "\"lowest_hp\"" | "\"priority\"" | string
direction-val ::= "\"toward_target\"" | "\"away_from_target\"" | "\"left\"" | "\"right\""

string ::= "\"" ([^"\\] | "\\" .)* "\""
ws     ::= [ \t\n]*
`

// ParseLLMAction parses raw JSON bytes into an LLMAction.
func ParseLLMAction(data []byte) (*LLMAction, error) {
	var action LLMAction
	if err := json.Unmarshal(data, &action); err != nil {
		return nil, fmt.Errorf("parse LLM action: %w", err)
	}

	// Validate required fields
	switch action.Action {
	case "ability", "dodge", "retreat", "idle":
		// valid
	default:
		return nil, fmt.Errorf("invalid action type: %q", action.Action)
	}

	switch action.Mood {
	case "neutral", "confident", "anxious", "frustrated", "refusing":
		// valid
	default:
		action.Mood = "neutral" // default if invalid
	}

	return &action, nil
}

// ToAIAction converts an LLMAction into the game's AIAction format,
// resolving target references against the current enemy set.
func (la *LLMAction) ToAIAction(player *Player, enemies map[string]*Enemy) *AIAction {
	ai := &AIAction{
		Type:     la.Action,
		Mood:     CharacterMood(la.Mood),
		Dialogue: la.Reason,
	}

	if la.Action == "ability" {
		ai.Ability = AbilityType(la.Ability)
	}

	// Resolve target
	var target *Enemy
	switch la.Target {
	case "nearest":
		target = findNearestEnemy(player.Position, enemies)
	case "lowest_hp":
		target = findLowestHPEnemy(enemies)
	case "priority":
		if player.CharAI != nil && player.CharAI.PriorityTargetID != "" {
			if e, ok := enemies[player.CharAI.PriorityTargetID]; ok && !e.IsDead() {
				target = e
			}
		}
		if target == nil {
			target = findNearestEnemy(player.Position, enemies)
		}
	default:
		// Try as enemy ID
		if e, ok := enemies[la.Target]; ok && !e.IsDead() {
			target = e
		}
	}

	if target != nil {
		ai.TargetID = target.ID
		dir := Vector3{
			X: target.Position.X - player.Position.X,
			Z: target.Position.Z - player.Position.Z,
		}
		dist := Distance2D(player.Position, target.Position)
		if dist > 0.001 {
			dir.X /= dist
			dir.Z /= dist
		}

		switch la.Direction {
		case "away_from_target":
			ai.Direction = Vector3{X: -dir.X, Z: -dir.Z}
		case "left":
			ai.Direction = Vector3{X: -dir.Z, Z: dir.X}
		case "right":
			ai.Direction = Vector3{X: dir.Z, Z: -dir.X}
		default: // "toward_target" or unset
			ai.Direction = dir
		}
	}

	return ai
}

func findNearestEnemy(pos Vector3, enemies map[string]*Enemy) *Enemy {
	var best *Enemy
	bestDist := 999999.0
	for _, e := range enemies {
		if e.IsDead() {
			continue
		}
		d := Distance2D(pos, e.Position)
		if d < bestDist {
			bestDist = d
			best = e
		}
	}
	return best
}

func findLowestHPEnemy(enemies map[string]*Enemy) *Enemy {
	var best *Enemy
	bestHP := 999999.0
	for _, e := range enemies {
		if e.IsDead() {
			continue
		}
		if e.Health < bestHP {
			bestHP = e.Health
			best = e
		}
	}
	return best
}
