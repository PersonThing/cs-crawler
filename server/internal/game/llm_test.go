package game

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseLLMAction_Valid(t *testing.T) {
	input := `{"action":"ability","ability":"fireball","target":"nearest","direction":"toward_target","mood":"confident","reason":"Time to burn!"}`

	action, err := ParseLLMAction([]byte(input))
	assert.NoError(t, err)
	assert.Equal(t, "ability", action.Action)
	assert.Equal(t, "fireball", action.Ability)
	assert.Equal(t, "nearest", action.Target)
	assert.Equal(t, "toward_target", action.Direction)
	assert.Equal(t, "confident", action.Mood)
	assert.Equal(t, "Time to burn!", action.Reason)
}

func TestParseLLMAction_Idle(t *testing.T) {
	input := `{"action":"idle","mood":"anxious","reason":"Too dangerous"}`

	action, err := ParseLLMAction([]byte(input))
	assert.NoError(t, err)
	assert.Equal(t, "idle", action.Action)
	assert.Equal(t, "anxious", action.Mood)
}

func TestParseLLMAction_InvalidAction(t *testing.T) {
	input := `{"action":"fly","mood":"neutral","reason":"..."}`

	_, err := ParseLLMAction([]byte(input))
	assert.Error(t, err)
}

func TestParseLLMAction_InvalidMoodDefaultsNeutral(t *testing.T) {
	input := `{"action":"idle","mood":"happy","reason":"yay"}`

	action, err := ParseLLMAction([]byte(input))
	assert.NoError(t, err)
	assert.Equal(t, "neutral", action.Mood) // invalid mood defaults to neutral
}

func TestStateSnapshotPrompt(t *testing.T) {
	player := &Player{
		Health:      80,
		MaxHealth:   100,
		Position:    Vector3{X: 5, Y: 0, Z: 5},
		LightRadius: 10,
		Abilities:   NewAbilityManager(),
		CharAI:      NewCharacterAI(),
	}

	enemies := map[string]*Enemy{
		"e1": {
			ID:        "e1",
			Type:      "skeleton",
			Position:  Vector3{X: 10, Y: 0, Z: 5},
			Health:    50,
			MaxHealth: 100,
		},
		"e2": {
			ID:        "e2",
			Type:      "zombie",
			Position:  Vector3{X: 100, Y: 0, Z: 100}, // too far
			Health:    100,
			MaxHealth: 100,
		},
	}

	snap := BuildStateSnapshot(player, enemies)
	assert.Equal(t, 0.8, snap.HealthPct)
	assert.Len(t, snap.Enemies, 1) // only e1 is within range
	assert.Equal(t, "skeleton", snap.Enemies[0].Type)

	prompt := snap.ToPrompt()
	assert.Contains(t, prompt, "HP:80%")
	assert.Contains(t, prompt, "skeleton")
	assert.NotContains(t, prompt, "zombie") // too far
}

func TestStateSnapshotDungeonLightFiltering(t *testing.T) {
	player := &Player{
		Health:      100,
		MaxHealth:   100,
		Position:    Vector3{X: 5, Y: -20, Z: 5}, // In dungeon (Y=-20)
		LightRadius: 8,
		Abilities:   NewAbilityManager(),
		CharAI:      NewCharacterAI(),
	}

	enemies := map[string]*Enemy{
		"close": {
			ID:        "close",
			Type:      "skeleton",
			Position:  Vector3{X: 10, Y: -20, Z: 5}, // 5 units away, within light
			Health:    100,
			MaxHealth: 100,
		},
		"dark": {
			ID:        "dark",
			Type:      "wraith",
			Position:  Vector3{X: 20, Y: -20, Z: 5}, // 15 units away, beyond light
			Health:    100,
			MaxHealth: 100,
		},
	}

	snap := BuildStateSnapshot(player, enemies)
	assert.True(t, snap.InDungeon)
	assert.Len(t, snap.Enemies, 1) // only "close" is within light radius
	assert.Equal(t, "skeleton", snap.Enemies[0].Type)
}

func TestLLMActionToAIAction(t *testing.T) {
	player := &Player{
		Position: Vector3{X: 0, Y: 0, Z: 0},
		CharAI:   NewCharacterAI(),
	}

	enemies := map[string]*Enemy{
		"e1": {
			ID:       "e1",
			Type:     "skeleton",
			Position: Vector3{X: 5, Y: 0, Z: 0},
			Health:   50,
			MaxHealth: 100,
		},
	}

	llmAction := &LLMAction{
		Action:    "ability",
		Ability:   "fireball",
		Target:    "nearest",
		Direction: "toward_target",
		Mood:      "confident",
		Reason:    "Burn it!",
	}

	ai := llmAction.ToAIAction(player, enemies)
	assert.Equal(t, "ability", ai.Type)
	assert.Equal(t, AbilityFireball, ai.Ability)
	assert.Equal(t, "e1", ai.TargetID)
	assert.InDelta(t, 1.0, ai.Direction.X, 0.01) // pointing right toward enemy
	assert.InDelta(t, 0.0, ai.Direction.Z, 0.01)
}
