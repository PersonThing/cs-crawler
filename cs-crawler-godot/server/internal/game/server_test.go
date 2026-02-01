package game

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewServer(t *testing.T) {
	server := NewServer(60)

	assert.Equal(t, 60, server.tickRate)
	assert.Equal(t, time.Second/60, server.tickPeriod)
	assert.NotNil(t, server.worlds)
	assert.NotNil(t, server.stopChan)
}

func TestCreateWorld(t *testing.T) {
	server := NewServer(60)

	world := server.CreateWorld("test-world")

	require.NotNil(t, world)
	assert.Equal(t, "test-world", world.ID)

	// Verify world is stored
	retrieved, ok := server.GetWorld("test-world")
	assert.True(t, ok)
	assert.Equal(t, world, retrieved)
}

func TestDestroyWorld(t *testing.T) {
	server := NewServer(60)
	server.CreateWorld("test-world")

	server.DestroyWorld("test-world")

	_, ok := server.GetWorld("test-world")
	assert.False(t, ok)
}

func TestGetWorld_NotFound(t *testing.T) {
	server := NewServer(60)

	_, ok := server.GetWorld("nonexistent")
	assert.False(t, ok)
}
