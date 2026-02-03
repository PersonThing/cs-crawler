package game

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewLobbyService(t *testing.T) {
	ls := NewLobbyService()

	assert.NotNil(t, ls)
	assert.NotNil(t, ls.games)
	assert.NotNil(t, ls.joinRequests)
	assert.NotNil(t, ls.gameRequests)
}

func TestCreateGame(t *testing.T) {
	ls := NewLobbyService()

	game, err := ls.CreateGame("player1", "TestPlayer", "Test Game", GameVisibilityPublic, 4)

	require.NoError(t, err)
	require.NotNil(t, game)
	assert.Equal(t, "Test Game", game.Name)
	assert.Equal(t, "player1", game.HostID)
	assert.Equal(t, "TestPlayer", game.HostName)
	assert.Equal(t, GameVisibilityPublic, game.Visibility)
	assert.Equal(t, 4, game.MaxPlayers)
	assert.Equal(t, 0, game.CurrentCount)
	assert.NotEmpty(t, game.ID)
	assert.NotEmpty(t, game.WorldID)
}

func TestCreateGameDefaultName(t *testing.T) {
	ls := NewLobbyService()

	game, err := ls.CreateGame("player1", "TestPlayer", "", GameVisibilityPublic, 4)

	require.NoError(t, err)
	assert.Equal(t, "TestPlayer's Game", game.Name)
}

func TestCreateGameMaxPlayersLimit(t *testing.T) {
	ls := NewLobbyService()

	// Test max players capped at 8
	game, err := ls.CreateGame("player1", "TestPlayer", "Big Game", GameVisibilityPublic, 100)

	require.NoError(t, err)
	assert.Equal(t, 8, game.MaxPlayers)

	// Test min players at 1
	game2, err := ls.CreateGame("player2", "TestPlayer2", "Small Game", GameVisibilityPublic, 0)

	require.NoError(t, err)
	assert.Equal(t, 4, game2.MaxPlayers) // Default to 4 when 0 or negative
}

func TestListGames(t *testing.T) {
	ls := NewLobbyService()

	// Create public game
	publicGame, err := ls.CreateGame("player1", "Player1", "Public Game", GameVisibilityPublic, 4)
	require.NoError(t, err)
	require.NotNil(t, publicGame)

	// Small delay to ensure unique timestamp-based IDs
	time.Sleep(time.Millisecond)

	// Create private game
	privateGame, err := ls.CreateGame("player2", "Player2", "Private Game", GameVisibilityPrivate, 4)
	require.NoError(t, err)
	require.NotNil(t, privateGame)

	// Verify IDs are unique
	require.NotEqual(t, publicGame.ID, privateGame.ID, "Games should have unique IDs")

	// Verify games are stored
	storedPublic, ok := ls.GetGame(publicGame.ID)
	require.True(t, ok, "Public game should be stored")
	require.Equal(t, GameVisibilityPublic, storedPublic.Visibility)

	// Player3 should only see public games
	games := ls.ListGames("player3")
	require.Len(t, games, 1, "Player3 should see 1 public game")
	assert.Equal(t, "Public Game", games[0].Name)

	// Player2 (host of private game) should see both their game and public games
	gamesForPlayer2 := ls.ListGames("player2")
	assert.Len(t, gamesForPlayer2, 2)
}

func TestGetGame(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("player1", "TestPlayer", "Test Game", GameVisibilityPublic, 4)

	retrieved, ok := ls.GetGame(game.ID)

	assert.True(t, ok)
	assert.Equal(t, game.ID, retrieved.ID)

	// Test non-existent game
	_, notOk := ls.GetGame("nonexistent")
	assert.False(t, notOk)
}

func TestUpdatePlayerCount(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("player1", "TestPlayer", "Test Game", GameVisibilityPublic, 4)
	assert.Equal(t, 0, game.CurrentCount)

	ls.UpdatePlayerCount(game.ID, 3)

	updated, _ := ls.GetGame(game.ID)
	assert.Equal(t, 3, updated.CurrentCount)
}

func TestRemoveGame(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("player1", "TestPlayer", "Test Game", GameVisibilityPublic, 4)

	ls.RemoveGame(game.ID)

	_, ok := ls.GetGame(game.ID)
	assert.False(t, ok)
}

func TestRequestJoin(t *testing.T) {
	ls := NewLobbyService()

	// Create private game
	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 4)

	// Request to join
	request, err := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	require.NoError(t, err)
	require.NotNil(t, request)
	assert.Equal(t, game.ID, request.GameID)
	assert.Equal(t, "joiner", request.PlayerID)
	assert.Equal(t, "JoinerPlayer", request.PlayerName)
	assert.Equal(t, JoinRequestPending, request.Status)
}

func TestRequestJoinPublicGame(t *testing.T) {
	ls := NewLobbyService()

	// Create public game
	game, _ := ls.CreateGame("host", "HostPlayer", "Public Game", GameVisibilityPublic, 4)

	// Request to join public game should fail
	_, err := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "public")
}

func TestRequestJoinDuplicate(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 4)

	// First request
	ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	// Duplicate request should fail
	_, err := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "pending")
}

func TestRequestJoinFullGame(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 2)
	ls.UpdatePlayerCount(game.ID, 2) // Game is now full

	_, err := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "full")
}

func TestRespondToRequest(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 4)
	request, _ := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	// Approve request
	approved, err := ls.RespondToRequest(request.ID, true)

	require.NoError(t, err)
	assert.Equal(t, JoinRequestApproved, approved.Status)
	assert.NotNil(t, approved.RespondedAt)
}

func TestRespondToRequestDeny(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 4)
	request, _ := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	// Deny request
	denied, err := ls.RespondToRequest(request.ID, false)

	require.NoError(t, err)
	assert.Equal(t, JoinRequestDenied, denied.Status)
}

func TestRespondToRequestAlreadyProcessed(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 4)
	request, _ := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	// Process first time
	ls.RespondToRequest(request.ID, true)

	// Try to respond again
	_, err := ls.RespondToRequest(request.ID, false)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already processed")
}

func TestGetPendingRequests(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 4)

	// Add multiple requests
	ls.RequestJoin(game.ID, "joiner1", "Joiner1")
	req2, _ := ls.RequestJoin(game.ID, "joiner2", "Joiner2")
	ls.RequestJoin(game.ID, "joiner3", "Joiner3")

	// Approve one
	ls.RespondToRequest(req2.ID, true)

	// Should only have 2 pending
	pending := ls.GetPendingRequests(game.ID)
	assert.Len(t, pending, 2)
}

func TestCanJoinGame(t *testing.T) {
	ls := NewLobbyService()

	// Test public game
	publicGame, _ := ls.CreateGame("host", "HostPlayer", "Public Game", GameVisibilityPublic, 4)

	canJoin, _ := ls.CanJoinGame(publicGame.ID, "anyone")
	assert.True(t, canJoin)

	// Test private game without request
	privateGame, _ := ls.CreateGame("host2", "HostPlayer2", "Private Game", GameVisibilityPrivate, 4)

	canJoin, reason := ls.CanJoinGame(privateGame.ID, "anyone")
	assert.False(t, canJoin)
	assert.Contains(t, reason, "request")

	// Test host can join own private game
	canJoin, _ = ls.CanJoinGame(privateGame.ID, "host2")
	assert.True(t, canJoin)

	// Test approved request
	request, _ := ls.RequestJoin(privateGame.ID, "approved_player", "ApprovedPlayer")
	ls.RespondToRequest(request.ID, true)

	canJoin, _ = ls.CanJoinGame(privateGame.ID, "approved_player")
	assert.True(t, canJoin)
}

func TestCanJoinFullGame(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Full Game", GameVisibilityPublic, 2)
	ls.UpdatePlayerCount(game.ID, 2)

	canJoin, reason := ls.CanJoinGame(game.ID, "anyone")
	assert.False(t, canJoin)
	assert.Contains(t, reason, "full")
}

func TestGameListingSerialize(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("player1", "TestPlayer", "Test Game", GameVisibilityPublic, 4)
	game.CurrentCount = 2

	data := game.Serialize()

	assert.Equal(t, game.ID, data["id"])
	assert.Equal(t, "Test Game", data["name"])
	assert.Equal(t, "player1", data["hostID"])
	assert.Equal(t, "TestPlayer", data["hostName"])
	assert.Equal(t, "public", data["visibility"])
	assert.Equal(t, 4, data["maxPlayers"])
	assert.Equal(t, 2, data["currentCount"])
}

func TestJoinRequestSerialize(t *testing.T) {
	ls := NewLobbyService()

	game, _ := ls.CreateGame("host", "HostPlayer", "Private Game", GameVisibilityPrivate, 4)
	request, _ := ls.RequestJoin(game.ID, "joiner", "JoinerPlayer")

	data := request.Serialize()

	assert.Equal(t, request.ID, data["id"])
	assert.Equal(t, game.ID, data["gameID"])
	assert.Equal(t, "joiner", data["playerID"])
	assert.Equal(t, "JoinerPlayer", data["playerName"])
	assert.Equal(t, "pending", data["status"])
}
