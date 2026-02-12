package game

import (
	"os"
	"testing"

	"github.com/PersonThing/cs-crawler/server/internal/config"
)

func TestMain(m *testing.M) {
	// Initialize config defaults for tests
	config.Player = config.PlayerData{
		BaseStats: config.PlayerStats{
			Health:    100,
			MaxHealth: 100,
			MoveSpeed: 5,
		},
	}

	os.Exit(m.Run())
}
