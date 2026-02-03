package game

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewServer(t *testing.T) {
	server := NewServer(60, nil)

	assert.Equal(t, 60, server.tickRate)
	assert.Equal(t, time.Second/60, server.tickPeriod)
	assert.NotNil(t, server.worlds)
	assert.NotNil(t, server.stopChan)
}

func TestCreateWorld(t *testing.T) {
	server := NewServer(60, nil)

	world := server.CreateWorld("test-world")

	require.NotNil(t, world)
	assert.Equal(t, "test-world", world.ID)

	// Verify world is stored
	retrieved, ok := server.GetWorld("test-world")
	assert.True(t, ok)
	assert.Equal(t, world, retrieved)
}

func TestDestroyWorld(t *testing.T) {
	server := NewServer(60, nil)
	server.CreateWorld("test-world")

	server.DestroyWorld("test-world")

	_, ok := server.GetWorld("test-world")
	assert.False(t, ok)
}

func TestGetWorld_NotFound(t *testing.T) {
	server := NewServer(60, nil)

	_, ok := server.GetWorld("nonexistent")
	assert.False(t, ok)
}
