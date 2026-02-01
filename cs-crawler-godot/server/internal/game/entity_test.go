package game

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewPlayer(t *testing.T) {
	player := NewPlayer("player-1", "TestUser")

	assert.Equal(t, "player-1", player.ID)
	assert.Equal(t, "TestUser", player.Username)
	assert.Equal(t, 100.0, player.Health)
	assert.Equal(t, 100.0, player.MaxHealth)
	assert.Equal(t, 5.0, player.MoveSpeed)
	assert.Equal(t, 0.0, player.Position.X)
	assert.Equal(t, 0.0, player.Position.Y)
	assert.Equal(t, 0.0, player.Position.Z)
}

func TestPlayerUpdate(t *testing.T) {
	player := NewPlayer("player-1", "TestUser")
	player.Velocity = Vector3{X: 10, Y: 0, Z: 5}

	player.Update(1.0) // 1 second delta

	assert.Equal(t, 10.0, player.Position.X)
	assert.Equal(t, 0.0, player.Position.Y)
	assert.Equal(t, 5.0, player.Position.Z)
}

func TestPlayerSerialize(t *testing.T) {
	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 10, Y: 2, Z: 5}
	player.Health = 75

	data := player.Serialize()

	assert.Equal(t, "player-1", data["id"])
	assert.Equal(t, "TestUser", data["username"])
	assert.Equal(t, 75.0, data["health"])
	assert.Equal(t, 100.0, data["maxHealth"])

	pos := data["position"].(Vector3)
	assert.Equal(t, 10.0, pos.X)
	assert.Equal(t, 2.0, pos.Y)
	assert.Equal(t, 5.0, pos.Z)
}

func TestProjectileShouldDestroy(t *testing.T) {
	projectile := &Projectile{
		ID:        "proj-1",
		CreatedAt: time.Now().Add(-3 * time.Second),
		Lifetime:  2.0, // 2 second lifetime
	}

	assert.True(t, projectile.ShouldDestroy())

	projectile.CreatedAt = time.Now()
	assert.False(t, projectile.ShouldDestroy())
}

func TestProjectileUpdate(t *testing.T) {
	projectile := &Projectile{
		Position: Vector3{X: 0, Y: 0, Z: 0},
		Velocity: Vector3{X: 10, Y: 5, Z: 0},
	}

	projectile.Update(0.5) // 0.5 second delta

	assert.Equal(t, 5.0, projectile.Position.X)
	assert.Equal(t, 2.5, projectile.Position.Y)
	assert.Equal(t, 0.0, projectile.Position.Z)
}
