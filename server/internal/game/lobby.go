package game

import (
	"fmt"
	"sync"
	"time"
)

// GameVisibility defines game privacy settings
type GameVisibility string

const (
	GameVisibilityPublic  GameVisibility = "public"
	GameVisibilityPrivate GameVisibility = "private"
)

// JoinRequestStatus defines the status of a join request
type JoinRequestStatus string

const (
	JoinRequestPending  JoinRequestStatus = "pending"
	JoinRequestApproved JoinRequestStatus = "approved"
	JoinRequestDenied   JoinRequestStatus = "denied"
)

// GameListing represents a game that can be joined
type GameListing struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	HostID       string         `json:"hostID"`
	HostName     string         `json:"hostName"`
	Visibility   GameVisibility `json:"visibility"`
	MaxPlayers   int            `json:"maxPlayers"`
	CurrentCount int            `json:"currentCount"`
	Created      time.Time      `json:"created"`
	WorldID      string         `json:"worldID"`
}

// JoinRequest represents a request to join a private game
type JoinRequest struct {
	ID          string            `json:"id"`
	GameID      string            `json:"gameID"`
	PlayerID    string            `json:"playerID"`
	PlayerName  string            `json:"playerName"`
	Status      JoinRequestStatus `json:"status"`
	RequestedAt time.Time         `json:"requestedAt"`
	RespondedAt *time.Time        `json:"respondedAt,omitempty"`
}

// LobbyService manages game listings and join requests
type LobbyService struct {
	mu           sync.RWMutex
	games        map[string]*GameListing
	joinRequests map[string]*JoinRequest // requestID -> JoinRequest
	gameRequests map[string][]string     // gameID -> []requestIDs
	nextRequestID int
}

// NewLobbyService creates a new lobby service
func NewLobbyService() *LobbyService {
	return &LobbyService{
		games:        make(map[string]*GameListing),
		joinRequests: make(map[string]*JoinRequest),
		gameRequests: make(map[string][]string),
		nextRequestID: 1,
	}
}

// CreateGame creates a new game listing
func (ls *LobbyService) CreateGame(hostID, hostName, name string, visibility GameVisibility, maxPlayers int) (*GameListing, error) {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	if name == "" {
		name = fmt.Sprintf("%s's Game", hostName)
	}

	if maxPlayers <= 0 {
		maxPlayers = 4
	}

	if maxPlayers > 8 {
		maxPlayers = 8
	}

	// Generate world ID
	worldID := fmt.Sprintf("game-%d", time.Now().UnixNano())

	game := &GameListing{
		ID:           worldID,
		Name:         name,
		HostID:       hostID,
		HostName:     hostName,
		Visibility:   visibility,
		MaxPlayers:   maxPlayers,
		CurrentCount: 0,
		Created:      time.Now(),
		WorldID:      worldID,
	}

	ls.games[game.ID] = game
	ls.gameRequests[game.ID] = []string{}

	return game, nil
}

// GetGame returns a game by ID
func (ls *LobbyService) GetGame(gameID string) (*GameListing, bool) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	game, ok := ls.games[gameID]
	return game, ok
}

// ListGames returns all public games and games where the player has pending requests
func (ls *LobbyService) ListGames(playerID string) []*GameListing {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	games := make([]*GameListing, 0)
	for _, game := range ls.games {
		// Include public games or games the player hosts
		if game.Visibility == GameVisibilityPublic || game.HostID == playerID {
			games = append(games, game)
		}
	}

	return games
}

// UpdatePlayerCount updates the current player count for a game
func (ls *LobbyService) UpdatePlayerCount(gameID string, count int) {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	if game, ok := ls.games[gameID]; ok {
		game.CurrentCount = count
	}
}

// RemoveGame removes a game listing
func (ls *LobbyService) RemoveGame(gameID string) {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	delete(ls.games, gameID)

	// Clean up join requests for this game
	if requestIDs, ok := ls.gameRequests[gameID]; ok {
		for _, reqID := range requestIDs {
			delete(ls.joinRequests, reqID)
		}
		delete(ls.gameRequests, gameID)
	}
}

// RequestJoin creates a join request for a private game
func (ls *LobbyService) RequestJoin(gameID, playerID, playerName string) (*JoinRequest, error) {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	game, ok := ls.games[gameID]
	if !ok {
		return nil, fmt.Errorf("game not found")
	}

	if game.Visibility != GameVisibilityPrivate {
		return nil, fmt.Errorf("game is public, no request needed")
	}

	if game.CurrentCount >= game.MaxPlayers {
		return nil, fmt.Errorf("game is full")
	}

	// Check if player already has a pending request
	for _, reqID := range ls.gameRequests[gameID] {
		req := ls.joinRequests[reqID]
		if req.PlayerID == playerID && req.Status == JoinRequestPending {
			return nil, fmt.Errorf("already have a pending request")
		}
	}

	requestID := fmt.Sprintf("req-%d", ls.nextRequestID)
	ls.nextRequestID++

	request := &JoinRequest{
		ID:          requestID,
		GameID:      gameID,
		PlayerID:    playerID,
		PlayerName:  playerName,
		Status:      JoinRequestPending,
		RequestedAt: time.Now(),
	}

	ls.joinRequests[requestID] = request
	ls.gameRequests[gameID] = append(ls.gameRequests[gameID], requestID)

	return request, nil
}

// GetPendingRequests returns all pending join requests for a game
func (ls *LobbyService) GetPendingRequests(gameID string) []*JoinRequest {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	requests := make([]*JoinRequest, 0)
	if requestIDs, ok := ls.gameRequests[gameID]; ok {
		for _, reqID := range requestIDs {
			req := ls.joinRequests[reqID]
			if req.Status == JoinRequestPending {
				requests = append(requests, req)
			}
		}
	}

	return requests
}

// RespondToRequest approves or denies a join request
func (ls *LobbyService) RespondToRequest(requestID string, approved bool) (*JoinRequest, error) {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	request, ok := ls.joinRequests[requestID]
	if !ok {
		return nil, fmt.Errorf("request not found")
	}

	if request.Status != JoinRequestPending {
		return nil, fmt.Errorf("request already processed")
	}

	now := time.Now()
	request.RespondedAt = &now

	if approved {
		request.Status = JoinRequestApproved
	} else {
		request.Status = JoinRequestDenied
	}

	return request, nil
}

// GetRequest returns a join request by ID
func (ls *LobbyService) GetRequest(requestID string) (*JoinRequest, bool) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	request, ok := ls.joinRequests[requestID]
	return request, ok
}

// CanJoinGame checks if a player can join a game
func (ls *LobbyService) CanJoinGame(gameID, playerID string) (bool, string) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	game, ok := ls.games[gameID]
	if !ok {
		return false, "game not found"
	}

	if game.CurrentCount >= game.MaxPlayers {
		return false, "game is full"
	}

	// Public games can be joined directly
	if game.Visibility == GameVisibilityPublic {
		return true, ""
	}

	// Host can always join their own game
	if game.HostID == playerID {
		return true, ""
	}

	// Private games require an approved request
	for _, reqID := range ls.gameRequests[gameID] {
		req := ls.joinRequests[reqID]
		if req.PlayerID == playerID && req.Status == JoinRequestApproved {
			return true, ""
		}
	}

	return false, "join request required"
}

// Serialize converts a GameListing to a map for JSON
func (gl *GameListing) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":           gl.ID,
		"name":         gl.Name,
		"hostID":       gl.HostID,
		"hostName":     gl.HostName,
		"visibility":   string(gl.Visibility),
		"maxPlayers":   gl.MaxPlayers,
		"currentCount": gl.CurrentCount,
		"created":      gl.Created.Unix(),
		"worldID":      gl.WorldID,
	}
}

// Serialize converts a JoinRequest to a map for JSON
func (jr *JoinRequest) Serialize() map[string]interface{} {
	data := map[string]interface{}{
		"id":          jr.ID,
		"gameID":      jr.GameID,
		"playerID":    jr.PlayerID,
		"playerName":  jr.PlayerName,
		"status":      string(jr.Status),
		"requestedAt": jr.RequestedAt.Unix(),
	}

	if jr.RespondedAt != nil {
		data["respondedAt"] = jr.RespondedAt.Unix()
	}

	return data
}
