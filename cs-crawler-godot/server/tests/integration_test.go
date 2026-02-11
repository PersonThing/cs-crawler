// +build integration

package tests

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/cs-crawler-godot/server/internal/game"
	"github.com/yourusername/cs-crawler-godot/server/internal/network"
)

func TestClientServerIntegration(t *testing.T) {
	// Create game server
	gameServer := game.NewServer(60, nil, nil)
	go gameServer.Start()
	defer gameServer.Stop()

	// Create network server
	netServer := network.NewServer(":0", gameServer)
	httpServer := httptest.NewServer(netServer)
	defer httpServer.Close()

	// Connect client
	wsURL := "ws" + strings.TrimPrefix(httpServer.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	defer conn.Close()

	// Send join message
	joinMsg := map[string]interface{}{
		"type":     "join",
		"username": "TestPlayer",
		"worldID":  "test-world",
	}
	err = conn.WriteJSON(joinMsg)
	require.NoError(t, err)

	// Read join response
	var joinedMsg map[string]interface{}
	err = conn.ReadJSON(&joinedMsg)
	require.NoError(t, err)

	assert.Equal(t, "joined", joinedMsg["type"])
	assert.NotEmpty(t, joinedMsg["playerID"])
	assert.Equal(t, "test-world", joinedMsg["worldID"])

	playerID := joinedMsg["playerID"].(string)

	// Send move message
	moveMsg := map[string]interface{}{
		"type": "move",
		"velocity": map[string]interface{}{
			"x": 1.0,
			"y": 0.0,
			"z": 0.5,
		},
	}
	err = conn.WriteJSON(moveMsg)
	require.NoError(t, err)

	// Wait for world state broadcast
	time.Sleep(100 * time.Millisecond)

	// Read world state
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var stateMsg map[string]interface{}
	err = conn.ReadJSON(&stateMsg)
	require.NoError(t, err)

	assert.Equal(t, "world_state", stateMsg["type"])
	players := stateMsg["players"].([]interface{})
	assert.Len(t, players, 1)

	playerData := players[0].(map[string]interface{})
	assert.Equal(t, playerID, playerData["id"])
}

func TestMultipleClients(t *testing.T) {
	// Create servers
	gameServer := game.NewServer(60, nil, nil)
	go gameServer.Start()
	defer gameServer.Stop()

	netServer := network.NewServer(":0", gameServer)
	httpServer := httptest.NewServer(netServer)
	defer httpServer.Close()

	wsURL := "ws" + strings.TrimPrefix(httpServer.URL, "http") + "/ws"

	// Connect two clients
	conn1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	defer conn1.Close()

	conn2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	defer conn2.Close()

	// Both join same world
	conn1.WriteJSON(map[string]interface{}{
		"type":     "join",
		"username": "Player1",
		"worldID":  "test",
	})

	conn2.WriteJSON(map[string]interface{}{
		"type":     "join",
		"username": "Player2",
		"worldID":  "test",
	})

	// Skip join responses
	var msg1, msg2 map[string]interface{}
	conn1.ReadJSON(&msg1)
	conn2.ReadJSON(&msg2)

	// Wait for state broadcast
	time.Sleep(200 * time.Millisecond)

	// Read world state from client 1
	conn1.SetReadDeadline(time.Now().Add(2 * time.Second))
	var state map[string]interface{}
	err = conn1.ReadJSON(&state)
	require.NoError(t, err)

	// Should see both players
	if state["type"] == "world_state" {
		players := state["players"].([]interface{})
		assert.GreaterOrEqual(t, len(players), 2)
	}
}
