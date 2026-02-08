package network

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/yourusername/cs-crawler-godot/server/internal/config"
	"github.com/yourusername/cs-crawler-godot/server/internal/game"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024 // 1 MB
)

// Client represents a connected WebSocket client
type Client struct {
	conn      *websocket.Conn
	server    *Server
	send      chan []byte
	playerID  string
	username  string
	worldID   string
	modifiers map[string]bool // Active modifiers (modifier_type -> enabled)
}

// NewClient creates a new client
func NewClient(conn *websocket.Conn, server *Server) *Client {
	return &Client{
		conn:      conn,
		server:    server,
		send:      make(chan []byte, 1024), // Increased buffer for 60 TPS world states
		modifiers: make(map[string]bool),
	}
}

// ReadPump handles incoming messages from the client
func (c *Client) ReadPump() {
	defer func() {
		c.server.unregisterClient(c)
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		c.handleMessage(message)
	}
}

// WritePump sends messages to the client
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming client messages
func (c *Client) handleMessage(data []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Failed to parse message: %v", err)
		return
	}

	msgType, ok := msg["type"].(string)
	if !ok {
		log.Printf("Message missing type field")
		return
	}

	switch msgType {
	case "login":
		c.handleLogin(msg)
	case "join":
		c.handleJoin(msg)
	case "move":
		c.handleMove(msg)
	case "use_ability":
		c.handleUseAbility(msg)
	case "set_modifier":
		c.handleSetModifier(msg)
	case "pickup_item":
		c.handlePickupItem(msg)
	case "equip_item":
		c.handleEquipItem(msg)
	case "unequip_item":
		c.handleUnequipItem(msg)
	case "swap_bag":
		c.handleSwapBag(msg)
	case "swap_equipment":
		c.handleSwapEquipment(msg)
	case "drop_item":
		c.handleDropItem(msg)
	case "enter_dungeon":
		c.handleEnterDungeon(msg)
	case "exit_dungeon":
		c.handleExitDungeon(msg)
	// Lobby messages
	case "list_games":
		c.handleListGames(msg)
	case "create_game":
		c.handleCreateGame(msg)
	case "join_game":
		c.handleJoinGame(msg)
	case "request_join":
		c.handleRequestJoin(msg)
	case "respond_join_request":
		c.handleRespondJoinRequest(msg)
	case "get_join_requests":
		c.handleGetJoinRequests(msg)
	// Chat messages
	case "chat":
		c.handleChat(msg)
	default:
		log.Printf("Unknown message type: %s", msgType)
	}
}

// handleLogin processes a player login (entering lobby, not joining a game world)
func (c *Client) handleLogin(msg map[string]interface{}) {
	username, _ := msg["username"].(string)

	if username == "" {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "INVALID_USERNAME",
			"message": "Username is required",
		})
		return
	}

	// Generate player ID and store info
	c.playerID = generatePlayerID()
	c.username = username

	log.Printf("[LOGIN] Player logged in: %s (%s)", username, c.playerID)

	c.Send(map[string]interface{}{
		"type":     "logged_in",
		"playerID": c.playerID,
		"username": username,
	})
}

// handleJoin processes a player join request
func (c *Client) handleJoin(msg map[string]interface{}) {
	log.Printf("[JOIN] Received join request")
	username, _ := msg["username"].(string)
	worldID, _ := msg["worldID"].(string)

	log.Printf("[JOIN] Username: %s, WorldID: %s", username, worldID)

	if username == "" {
		log.Printf("[JOIN] ERROR: Empty username")
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "INVALID_USERNAME",
			"message": "Username is required",
		})
		return
	}

	if worldID == "" {
		worldID = "default"
	}

	// Get or create world
	world, ok := c.server.gameServer.GetWorld(worldID)
	if !ok {
		log.Printf("[JOIN] Creating new world: %s", worldID)
		world = c.server.gameServer.CreateWorld(worldID)
	} else {
		// Cancel shutdown timer if world was scheduled for shutdown
		c.server.cancelWorldShutdown(worldID)
	}

	// Generate unique player ID
	c.playerID = generatePlayerID()
	c.username = username

	// Create player
	player := game.NewPlayer(c.playerID, username)

	// Try to load saved data from database
	savedData, err := c.server.db.LoadPlayer(username)
	if err != nil {
		log.Printf("[LOAD] Error loading player %s: %v", username, err)
	} else if savedData != nil {
		player.RestoreFromSave(
			savedData.PositionX, savedData.PositionY, savedData.PositionZ,
			savedData.Rotation, savedData.Health,
			savedData.EquippedItems, savedData.BagItems,
		)
		if config.Server.Debug.LogPlayerLoads {
			log.Printf("[LOAD] Restored player %s from database (pos: %.1f, %.1f, %.1f)",
				username, savedData.PositionX, savedData.PositionY, savedData.PositionZ)
		}
	} else {
		if config.Server.Debug.LogPlayerLoads {
			log.Printf("[LOAD] No saved data for %s, creating fresh player", username)
		}
	}

	world.AddPlayer(player)
	c.worldID = worldID

	// Send join confirmation with full state including inventory
	joinResponse := player.Serialize()
	joinResponse["type"] = "joined"
	joinResponse["playerID"] = c.playerID
	joinResponse["worldID"] = worldID

	c.Send(joinResponse)

	// Send board summary (minimap data) to new player
	boardData := world.GetBoardData()
	if boardData != nil {
		boardData["type"] = "board_data"
		c.Send(boardData)
		log.Printf("[BOARD] Sent board data to player %s", c.playerID)
	}

	// Send initial tiles around the player's spawn
	newTiles := world.GetNewTilesForPlayer(c.playerID)
	for _, tile := range newTiles {
		c.Send(map[string]interface{}{
			"type": "tile_data",
			"tile": tile.Serialize(),
		})
	}
	if len(newTiles) > 0 {
		log.Printf("[BOARD] Sent %d initial tiles to player %s", len(newTiles), c.playerID)
	}

	log.Printf("Player %s (%s) joined world %s", username, c.playerID, worldID)
}

// handleMove processes player movement input
func (c *Client) handleMove(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		log.Printf("[MOVE] Player not joined yet, ignoring move message")
		return // Not joined yet
	}

	// Parse velocity
	velocityMap, ok := msg["velocity"].(map[string]interface{})
	if !ok {
		log.Printf("[MOVE] Invalid velocity format in move message")
		return
	}

	velocity := game.Vector3{
		X: getFloat64(velocityMap, "x"),
		Y: getFloat64(velocityMap, "y"),
		Z: getFloat64(velocityMap, "z"),
	}

	// Parse rotation (optional, defaults to 0)
	rotation := 0.0
	if rotationVal, ok := msg["rotation"].(float64); ok {
		rotation = rotationVal
	}

	// Get world and player
	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		log.Printf("[MOVE] World %s not found", c.worldID)
		return
	}

	players := world.GetPlayers()
	player, ok := players[c.playerID]
	if !ok {
		log.Printf("[MOVE] Player %s not found in world", c.playerID)
		return
	}

	// Update player velocity and rotation (server will update position in game loop)
	player.SetVelocity(velocity)
	player.Rotation = rotation
	if config.Server.Debug.LogPlayerMovement {
		log.Printf("[MOVE] Player %s position: (%.2f, %.2f, %.2f)", c.playerID, player.Position.X, player.Position.Y, player.Position.Z)
	}
}

// handleUseAbility processes ability usage
func (c *Client) handleUseAbility(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		log.Printf("[ABILITY] Player not joined yet, ignoring ability message")
		return
	}

	// Parse ability type
	abilityTypeStr, ok := msg["abilityType"].(string)
	if !ok {
		log.Printf("[ABILITY] Invalid ability type in message")
		return
	}
	abilityType := game.AbilityType(abilityTypeStr)

	// Parse target direction
	directionMap, ok := msg["direction"].(map[string]interface{})
	if !ok {
		log.Printf("[ABILITY] Invalid direction in message")
		return
	}

	direction := game.Vector3{
		X: getFloat64(directionMap, "x"),
		Y: getFloat64(directionMap, "y"),
		Z: getFloat64(directionMap, "z"),
	}

	if config.Server.Debug.LogAbilityCasts {
		log.Printf("[ABILITY] Player %s using ability %s in direction (%.2f, %.2f, %.2f)",
			c.playerID, abilityType, direction.X, direction.Y, direction.Z)
	}

	// Get world and player
	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		log.Printf("[ABILITY] World %s not found", c.worldID)
		return
	}

	players := world.GetPlayers()
	player, ok := players[c.playerID]
	if !ok {
		log.Printf("[ABILITY] Player %s not found in world", c.playerID)
		return
	}

	// Try to use ability
	ability, err := player.Abilities.UseAbility(abilityType)
	if err != nil {
		log.Printf("[ABILITY] Cannot use ability: %v", err)
		c.Send(map[string]interface{}{
			"type":    "ability_failed",
			"reason":  err.Error(),
			"ability": string(abilityType),
		})
		return
	}

	if config.Server.Debug.LogAbilityCasts {
		log.Printf("[ABILITY] Ability %s used successfully (category: %s)", abilityType, ability.Category)
	}

	// Handle pet and turret modifiers - these create minions
	if c.modifiers["pet"] {
		// Create a pet minion that follows the player
		minionID := fmt.Sprintf("pet-%s-%d", c.playerID, time.Now().UnixNano())
		modifier := game.Modifier{
			Type:           game.ModifierPet,
			MinionDuration: 30.0, // 30 seconds
			CastInterval:   2.0,  // Cast ability every 2 seconds
		}

		pet := game.NewPet(minionID, player.ID, player.Position, ability, abilityType, &modifier)
		world.AddMinion(pet)

		if config.Server.Debug.LogAbilityCasts {
			log.Printf("[ABILITY] Created pet minion %s for player %s", minionID, c.playerID)
		}

		// Broadcast pet creation
		c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
			"type":        "minion_spawned",
			"minionID":    minionID,
			"minionType":  "pet",
			"ownerID":     player.ID,
			"position":    player.Position,
			"abilityType": string(abilityType),
		})
	}

	if c.modifiers["turret"] {
		// Create a turret minion at the cast position
		minionID := fmt.Sprintf("turret-%s-%d", c.playerID, time.Now().UnixNano())

		// Place turret slightly ahead of player in cast direction
		turretPosition := game.Vector3{
			X: player.Position.X + direction.X*2.0,
			Y: player.Position.Y,
			Z: player.Position.Z + direction.Z*2.0,
		}

		modifier := game.Modifier{
			Type:           game.ModifierTurret,
			MinionDuration: 20.0, // 20 seconds
			CastInterval:   1.5,  // Cast ability every 1.5 seconds
		}

		turret := game.NewTurret(minionID, player.ID, turretPosition, ability, abilityType, &modifier)
		world.AddMinion(turret)

		if config.Server.Debug.LogAbilityCasts {
			log.Printf("[ABILITY] Created turret minion %s for player %s", minionID, c.playerID)
		}

		// Broadcast turret creation
		c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
			"type":        "minion_spawned",
			"minionID":    minionID,
			"minionType":  "turret",
			"ownerID":     player.ID,
			"position":    turretPosition,
			"abilityType": string(abilityType),
		})
	}

	// Handle ability based on category
	switch ability.Category {
	case game.AbilityCategoryProjectile:
		// Create projectile based on ability
		// Spawn projectile at player height (0.9 units above ground, which is half player height of 1.8)
		projectileID := generateProjectileID()
		spawnPosition := player.Position
		spawnPosition.Y = 0.9 // Half of player height (1.8 / 2)

		projectile := game.NewProjectile(
			projectileID,
			player.ID,
			spawnPosition,
			game.Vector3{
				X: direction.X * ability.Speed,
				Y: direction.Y * ability.Speed,
				Z: direction.Z * ability.Speed,
			},
			ability.Damage,
			ability.DamageType,
			string(abilityType),
		)

		// Store status effect info in projectile for application on hit
		projectile.StatusEffectInfo = ability.StatusEffect

		// Apply active modifiers
		if c.modifiers["homing"] {
			projectile.IsHoming = true
			projectile.HomingTurnRate = 360.0 // degrees per second
			if config.Server.Debug.LogAbilityCasts {
				log.Printf("[ABILITY] Applied homing modifier to projectile")
			}
		}

		if c.modifiers["piercing"] {
			projectile.IsPiercing = true
			projectile.MaxPierces = 3 // Can hit up to 3 enemies
			if config.Server.Debug.LogAbilityCasts {
				log.Printf("[ABILITY] Applied piercing modifier to projectile")
			}
		}

		world.AddProjectile(projectile)

		// Broadcast ability cast to all clients in world
		c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
			"type":         "ability_cast",
			"playerID":     player.ID,
			"abilityType":  string(abilityType),
			"position":     player.Position,
			"direction":    direction,
			"projectileID": projectileID,
		})

		if config.Server.Debug.LogAbilityCasts {
			log.Printf("[ABILITY] Projectile %s created for player %s", projectileID, c.playerID)
		}

	case game.AbilityCategoryInstant:
		// Instant ability (e.g., Lightning) - check line collision immediately
		enemies := world.GetEnemies()
		hitTargets := make([]string, 0)

		for _, enemy := range enemies {
			if game.CheckLineCollision(player.Position, direction, ability.Range, ability.Radius, enemy) {
				damageInfo := game.DamageInfo{
					Amount:   ability.Damage,
					Type:     ability.DamageType,
					SourceID: player.ID,
					TargetID: enemy.ID,
				}

				died := game.ApplyDamage(enemy, damageInfo)
				hitTargets = append(hitTargets, enemy.ID)

				// Apply status effect if present
				if ability.StatusEffect != nil {
					statusEffect := game.NewStatusEffect(
						ability.StatusEffect.Type,
						ability.StatusEffect.Duration,
						ability.StatusEffect.Magnitude,
						player.ID,
					)
					enemy.ApplyStatusEffect(statusEffect)
				}

				if config.Server.Debug.LogAbilityCasts {
					log.Printf("[ABILITY] Instant ability hit enemy %s (died: %v)", enemy.ID, died)
				}
			}
		}

		// Broadcast instant ability cast to all clients
		c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
			"type":        "ability_cast",
			"playerID":    player.ID,
			"abilityType": string(abilityType),
			"position":    player.Position,
			"direction":   direction,
			"hitTargets":  hitTargets,
		})

		if config.Server.Debug.LogAbilityCasts {
			log.Printf("[ABILITY] Instant ability %s hit %d targets", abilityType, len(hitTargets))
		}

	case game.AbilityCategoryMelee:
		// Melee ability (e.g., BasicAttack) - check cone collision immediately
		enemies := world.GetEnemies()
		hitTargets := make([]string, 0)

		for _, enemy := range enemies {
			if game.CheckConeCollision(player.Position, direction, ability.Range, ability.Angle, enemy) {
				damageInfo := game.DamageInfo{
					Amount:   ability.Damage,
					Type:     ability.DamageType,
					SourceID: player.ID,
					TargetID: enemy.ID,
				}

				died := game.ApplyDamage(enemy, damageInfo)
				hitTargets = append(hitTargets, enemy.ID)

				// Apply status effect if present
				if ability.StatusEffect != nil {
					statusEffect := game.NewStatusEffect(
						ability.StatusEffect.Type,
						ability.StatusEffect.Duration,
						ability.StatusEffect.Magnitude,
						player.ID,
					)
					enemy.ApplyStatusEffect(statusEffect)
				}

				if config.Server.Debug.LogAbilityCasts {
					log.Printf("[ABILITY] Melee ability hit enemy %s (died: %v)", enemy.ID, died)
				}
			}
		}

		// Broadcast melee ability cast to all clients
		c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
			"type":        "ability_cast",
			"playerID":    player.ID,
			"abilityType": string(abilityType),
			"position":    player.Position,
			"direction":   direction,
			"hitTargets":  hitTargets,
		})

		if config.Server.Debug.LogAbilityCasts {
			log.Printf("[ABILITY] Melee ability %s hit %d targets", abilityType, len(hitTargets))
		}
	}
}

// handleSetModifier processes modifier selection from client
func (c *Client) handleSetModifier(msg map[string]interface{}) {
	if c.playerID == "" {
		log.Printf("[MODIFIER] Player not joined yet, ignoring modifier message")
		return
	}

	// Parse modifier type
	modifierType, ok := msg["modifierType"].(string)
	if !ok {
		log.Printf("[MODIFIER] Invalid modifierType in message")
		return
	}

	// Parse enabled state
	enabled, ok := msg["enabled"].(bool)
	if !ok {
		log.Printf("[MODIFIER] Invalid enabled state in message")
		return
	}

	// Update modifier state
	c.modifiers[modifierType] = enabled

	log.Printf("[MODIFIER] Player %s set modifier %s to %v", c.playerID, modifierType, enabled)

	// Send confirmation back to client
	c.Send(map[string]interface{}{
		"type":         "modifier_updated",
		"modifierType": modifierType,
		"enabled":      enabled,
	})
}

// handlePickupItem processes a request to pick up a ground item
func (c *Client) handlePickupItem(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		log.Printf("[PICKUP] Player not joined yet, ignoring pickup request")
		return
	}

	groundItemID, ok := msg["groundItemID"].(string)
	if !ok {
		log.Printf("[PICKUP] Invalid groundItemID in message")
		return
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		log.Printf("[PICKUP] World not found: %s", c.worldID)
		return
	}

	err := world.PickupItem(c.playerID, groundItemID)
	if err != nil {
		log.Printf("[PICKUP] Failed to pickup item: %v", err)
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "PICKUP_FAILED",
			"message": err.Error(),
		})
		return
	}

	if config.Server.Debug.LogItemPickups {
		log.Printf("[PICKUP] Player %s picked up ground item %s", c.playerID, groundItemID)
	}

	// Get player for updated inventory data
	player := world.GetPlayer(c.playerID)
	response := map[string]interface{}{
		"type":         "item_picked_up",
		"groundItemID": groundItemID,
	}

	if player != nil && player.Inventory != nil {
		response["inventory"] = player.Inventory.Serialize()
		response["stats"] = player.Serialize()["stats"]
	}

	c.Send(response)
}

// handleEquipItem processes a request to equip an item from inventory
func (c *Client) handleEquipItem(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		log.Printf("[EQUIP] Player not joined yet, ignoring equip request")
		return
	}

	bagSlot, ok := msg["bagSlot"].(float64)
	if !ok {
		log.Printf("[EQUIP] Invalid bagSlot in message")
		return
	}

	// Optional target slot
	targetSlot := ""
	if ts, ok := msg["targetSlot"].(string); ok {
		targetSlot = ts
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		log.Printf("[EQUIP] World not found: %s", c.worldID)
		return
	}

	player := world.GetPlayer(c.playerID)
	if player == nil {
		log.Printf("[EQUIP] Player not found: %s", c.playerID)
		return
	}

	// Get item from bag
	item, err := player.Inventory.RemoveFromBag(int(bagSlot))
	if err != nil {
		log.Printf("[EQUIP] Failed to get item from bag: %v", err)
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "EQUIP_FAILED",
			"message": err.Error(),
		})
		return
	}

	// Equip the item to the target slot (or auto-select if empty)
	unequippedItems, err := player.EquipItemToSlot(item, game.EquipmentSlot(targetSlot))
	if err != nil {
		// Put item back in bag if equip failed
		player.Inventory.AddToBag(item)
		log.Printf("[EQUIP] Failed to equip item: %v", err)
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "EQUIP_FAILED",
			"message": err.Error(),
		})
		return
	}

	// If items were unequipped, put them back in bag
	// First item goes to the source bag slot if available
	sourceBagSlot := int(bagSlot)
	for i, unequippedItem := range unequippedItems {
		if unequippedItem == nil {
			continue
		}
		if i == 0 && sourceBagSlot >= 0 && sourceBagSlot < player.Inventory.MaxBagSlots && player.Inventory.Bags[sourceBagSlot] == nil {
			player.Inventory.Bags[sourceBagSlot] = unequippedItem
		} else {
			_, err := player.Inventory.AddToBag(unequippedItem)
			if err != nil {
				log.Printf("[EQUIP] Warning: Failed to add unequipped item to bag: %v", err)
			}
		}
	}

	log.Printf("[EQUIP] Player %s equipped item %s to slot %s", c.playerID, item.Name, targetSlot)

	// Send success confirmation with updated stats
	c.Send(map[string]interface{}{
		"type":      "item_equipped",
		"item":      item.Serialize(),
		"inventory": player.Inventory.Serialize(),
		"stats":     player.Serialize()["stats"],
	})
}

// handleUnequipItem processes a request to unequip an item
func (c *Client) handleUnequipItem(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		log.Printf("[UNEQUIP] Player not joined yet, ignoring unequip request")
		return
	}

	slotName, ok := msg["slot"].(string)
	if !ok {
		log.Printf("[UNEQUIP] Invalid slot in message")
		return
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		log.Printf("[UNEQUIP] World not found: %s", c.worldID)
		return
	}

	player := world.GetPlayer(c.playerID)
	if player == nil {
		log.Printf("[UNEQUIP] Player not found: %s", c.playerID)
		return
	}

	// Unequip the item
	slot := game.EquipmentSlot(slotName)
	item, err := player.UnequipSlot(slot)
	if err != nil {
		log.Printf("[UNEQUIP] Failed to unequip item: %v", err)
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "UNEQUIP_FAILED",
			"message": err.Error(),
		})
		return
	}

	// Try to place in specific target bag slot if provided
	placed := false
	if targetSlot, ok := msg["targetBagSlot"].(float64); ok {
		idx := int(targetSlot)
		if idx >= 0 && idx < player.Inventory.MaxBagSlots && player.Inventory.Bags[idx] == nil {
			player.Inventory.Bags[idx] = item
			placed = true
		}
	}

	// Fallback: add to first empty bag slot
	if !placed {
		_, err = player.Inventory.AddToBag(item)
		if err != nil {
			// If bag is full, re-equip the item
			player.EquipItem(item)
			log.Printf("[UNEQUIP] Bag is full, cannot unequip")
			c.Send(map[string]interface{}{
				"type":    "error",
				"code":    "BAG_FULL",
				"message": "Inventory is full",
			})
			return
		}
	}

	log.Printf("[UNEQUIP] Player %s unequipped item from slot %s", c.playerID, slotName)

	// Send success confirmation with updated stats
	c.Send(map[string]interface{}{
		"type":      "item_unequipped",
		"slot":      slotName,
		"inventory": player.Inventory.Serialize(),
		"stats":     player.Serialize()["stats"],
	})
}

// handleSwapBag processes a request to swap two bag items
func (c *Client) handleSwapBag(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		return
	}

	fromSlot, ok := msg["fromSlot"].(float64)
	if !ok {
		log.Printf("[SWAP] Invalid fromSlot in message")
		return
	}
	toSlot, ok := msg["toSlot"].(float64)
	if !ok {
		log.Printf("[SWAP] Invalid toSlot in message")
		return
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		return
	}

	err := world.SwapBagItems(c.playerID, int(fromSlot), int(toSlot))
	if err != nil {
		log.Printf("[SWAP] Failed to swap bag items: %v", err)
		return
	}

	player := world.GetPlayer(c.playerID)
	if player != nil && player.Inventory != nil {
		c.Send(map[string]interface{}{
			"type":      "item_equipped",
			"inventory": player.Inventory.Serialize(),
			"stats":     player.Serialize()["stats"],
		})
	}

	log.Printf("[SWAP] Player %s swapped bag slots %d <-> %d", c.playerID, int(fromSlot), int(toSlot))
}

// handleSwapEquipment processes a request to swap two equipped items
func (c *Client) handleSwapEquipment(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		return
	}

	fromSlot, ok := msg["fromSlot"].(string)
	if !ok {
		log.Printf("[SWAP_EQUIP] Invalid fromSlot in message")
		return
	}
	toSlot, ok := msg["toSlot"].(string)
	if !ok {
		log.Printf("[SWAP_EQUIP] Invalid toSlot in message")
		return
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		return
	}

	err := world.SwapEquipmentItems(c.playerID, game.EquipmentSlot(fromSlot), game.EquipmentSlot(toSlot))
	if err != nil {
		log.Printf("[SWAP_EQUIP] Failed to swap equipment: %v", err)
		return
	}

	player := world.GetPlayer(c.playerID)
	if player != nil && player.Inventory != nil {
		c.Send(map[string]interface{}{
			"type":      "item_equipped",
			"inventory": player.Inventory.Serialize(),
			"stats":     player.Serialize()["stats"],
		})
	}

	log.Printf("[SWAP_EQUIP] Player %s swapped equipment slots %s <-> %s", c.playerID, fromSlot, toSlot)
}

// handleDropItem processes a request to drop an item on the ground
func (c *Client) handleDropItem(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		return
	}

	source, ok := msg["source"].(string)
	if !ok {
		log.Printf("[DROP] Invalid source in message")
		return
	}

	slot := msg["slot"]
	if slot == nil {
		log.Printf("[DROP] Missing slot in message")
		return
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		return
	}

	err := world.DropItemFromInventory(c.playerID, source, slot)
	if err != nil {
		log.Printf("[DROP] Failed to drop item: %v", err)
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "DROP_FAILED",
			"message": err.Error(),
		})
		return
	}

	player := world.GetPlayer(c.playerID)
	if player != nil && player.Inventory != nil {
		c.Send(map[string]interface{}{
			"type":      "item_unequipped",
			"inventory": player.Inventory.Serialize(),
			"stats":     player.Serialize()["stats"],
		})
	}

	if config.Server.Debug.LogItemDrops {
		log.Printf("[DROP] Player %s dropped item from %s", c.playerID, source)
	}
}

// handleEnterDungeon moves the player into the dungeon beneath their current tile
func (c *Client) handleEnterDungeon(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		return
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		return
	}

	newPos, ok := world.EnterDungeon(c.playerID)
	if !ok {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "NOT_AT_ENTRANCE",
			"message": "You must be at a dungeon entrance to enter",
		})
		return
	}

	c.Send(map[string]interface{}{
		"type": "dungeon_entered",
		"position": map[string]interface{}{
			"x": newPos.X, "y": newPos.Y, "z": newPos.Z,
		},
	})

	log.Printf("[DUNGEON] Player %s entered dungeon", c.playerID)
}

// handleExitDungeon moves the player back to the overworld from a dungeon exit
func (c *Client) handleExitDungeon(msg map[string]interface{}) {
	if c.playerID == "" || c.worldID == "" {
		return
	}

	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		return
	}

	newPos, ok := world.ExitDungeon(c.playerID)
	if !ok {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "NOT_AT_EXIT",
			"message": "You must be at a dungeon exit to leave",
		})
		return
	}

	c.Send(map[string]interface{}{
		"type": "dungeon_exited",
		"position": map[string]interface{}{
			"x": newPos.X, "y": newPos.Y, "z": newPos.Z,
		},
	})

	log.Printf("[DUNGEON] Player %s exited dungeon", c.playerID)
}

// =====================
// Lobby Message Handlers
// =====================

// handleListGames returns a list of available games
func (c *Client) handleListGames(msg map[string]interface{}) {
	games := c.server.gameServer.Lobby.ListGames(c.playerID)

	gameList := make([]map[string]interface{}, 0, len(games))
	for _, game := range games {
		gameList = append(gameList, game.Serialize())
	}

	c.Send(map[string]interface{}{
		"type":  "game_list",
		"games": gameList,
	})
}

// handleCreateGame creates a new game
func (c *Client) handleCreateGame(msg map[string]interface{}) {
	if c.username == "" {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "NOT_LOGGED_IN",
			"message": "Must be logged in to create a game",
		})
		return
	}

	name, _ := msg["name"].(string)
	visibilityStr, _ := msg["visibility"].(string)
	maxPlayers := int(getFloat64(msg, "maxPlayers"))

	visibility := game.GameVisibilityPublic
	if visibilityStr == "private" {
		visibility = game.GameVisibilityPrivate
	}

	gameListing, err := c.server.gameServer.Lobby.CreateGame(c.playerID, c.username, name, visibility, maxPlayers)
	if err != nil {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "CREATE_FAILED",
			"message": err.Error(),
		})
		return
	}

	log.Printf("[LOBBY] Player %s created game: %s (%s)", c.username, gameListing.Name, gameListing.ID)

	c.Send(map[string]interface{}{
		"type": "game_created",
		"game": gameListing.Serialize(),
	})

	// Broadcast updated game list to all clients in lobby
	c.server.BroadcastToLobby(map[string]interface{}{
		"type":  "game_list_updated",
		"games": c.getGameList(),
	})
}

// handleJoinGame handles a player joining a game
func (c *Client) handleJoinGame(msg map[string]interface{}) {
	gameID, _ := msg["gameID"].(string)

	if gameID == "" {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "INVALID_GAME",
			"message": "Game ID required",
		})
		return
	}

	canJoin, reason := c.server.gameServer.Lobby.CanJoinGame(gameID, c.playerID)
	if !canJoin {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "JOIN_DENIED",
			"message": reason,
		})
		return
	}

	gameListing, ok := c.server.gameServer.Lobby.GetGame(gameID)
	if !ok {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "GAME_NOT_FOUND",
			"message": "Game not found",
		})
		return
	}

	// Join the game world
	c.joinGameWorld(gameListing.WorldID)
}

// handleRequestJoin handles a join request for a private game
func (c *Client) handleRequestJoin(msg map[string]interface{}) {
	gameID, _ := msg["gameID"].(string)

	if gameID == "" {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "INVALID_GAME",
			"message": "Game ID required",
		})
		return
	}

	request, err := c.server.gameServer.Lobby.RequestJoin(gameID, c.playerID, c.username)
	if err != nil {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "REQUEST_FAILED",
			"message": err.Error(),
		})
		return
	}

	log.Printf("[LOBBY] Player %s requested to join game %s", c.username, gameID)

	c.Send(map[string]interface{}{
		"type":    "join_requested",
		"request": request.Serialize(),
	})

	// Notify game host
	gameListing, _ := c.server.gameServer.Lobby.GetGame(gameID)
	if gameListing != nil {
		c.server.SendToPlayer(gameListing.HostID, map[string]interface{}{
			"type":    "join_request_received",
			"request": request.Serialize(),
		})
	}
}

// handleRespondJoinRequest handles a host responding to a join request
func (c *Client) handleRespondJoinRequest(msg map[string]interface{}) {
	requestID, _ := msg["requestID"].(string)
	approved, _ := msg["approved"].(bool)

	request, err := c.server.gameServer.Lobby.RespondToRequest(requestID, approved)
	if err != nil {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "RESPOND_FAILED",
			"message": err.Error(),
		})
		return
	}

	log.Printf("[LOBBY] Player %s %s join request %s", c.username, map[bool]string{true: "approved", false: "denied"}[approved], requestID)

	// Notify the requesting player
	c.server.SendToPlayer(request.PlayerID, map[string]interface{}{
		"type":     "join_request_response",
		"request":  request.Serialize(),
		"approved": approved,
	})

	c.Send(map[string]interface{}{
		"type":    "request_responded",
		"request": request.Serialize(),
	})
}

// handleGetJoinRequests returns pending join requests for a game the player hosts
func (c *Client) handleGetJoinRequests(msg map[string]interface{}) {
	gameID, _ := msg["gameID"].(string)

	gameListing, ok := c.server.gameServer.Lobby.GetGame(gameID)
	if !ok || gameListing.HostID != c.playerID {
		c.Send(map[string]interface{}{
			"type":    "error",
			"code":    "NOT_HOST",
			"message": "You are not the host of this game",
		})
		return
	}

	requests := c.server.gameServer.Lobby.GetPendingRequests(gameID)
	requestList := make([]map[string]interface{}, 0, len(requests))
	for _, req := range requests {
		requestList = append(requestList, req.Serialize())
	}

	c.Send(map[string]interface{}{
		"type":     "join_requests",
		"gameID":   gameID,
		"requests": requestList,
	})
}

// getGameList returns serialized game list
func (c *Client) getGameList() []map[string]interface{} {
	games := c.server.gameServer.Lobby.ListGames(c.playerID)
	gameList := make([]map[string]interface{}, 0, len(games))
	for _, g := range games {
		gameList = append(gameList, g.Serialize())
	}
	return gameList
}

// joinGameWorld joins a specific game world
func (c *Client) joinGameWorld(worldID string) {
	// Get or create world
	world, ok := c.server.gameServer.GetWorld(worldID)
	if !ok {
		world = c.server.gameServer.CreateWorld(worldID)
	}

	// Create player
	player := game.NewPlayer(c.playerID, c.username)

	// Try to load saved data
	savedData, err := c.server.db.LoadPlayer(c.username)
	if err == nil && savedData != nil {
		player.RestoreFromSave(
			savedData.PositionX, savedData.PositionY, savedData.PositionZ,
			savedData.Rotation, savedData.Health,
			savedData.EquippedItems, savedData.BagItems,
		)
	}

	world.AddPlayer(player)
	c.worldID = worldID

	// Update lobby player count
	c.server.gameServer.Lobby.UpdatePlayerCount(worldID, len(world.GetPlayers()))

	// Send join confirmation
	joinResponse := player.Serialize()
	joinResponse["type"] = "joined"
	joinResponse["playerID"] = c.playerID
	joinResponse["worldID"] = worldID

	c.Send(joinResponse)

	// Send board summary (minimap data)
	boardData := world.GetBoardData()
	if boardData != nil {
		boardData["type"] = "board_data"
		c.Send(boardData)
	}

	// Send initial tiles around the player's spawn
	newTiles := world.GetNewTilesForPlayer(c.playerID)
	for _, tile := range newTiles {
		c.Send(map[string]interface{}{
			"type": "tile_data",
			"tile": tile.Serialize(),
		})
	}

	log.Printf("[LOBBY] Player %s joined game world %s", c.username, worldID)
}

// =====================
// Chat Message Handlers
// =====================

// handleChat processes a chat message
func (c *Client) handleChat(msg map[string]interface{}) {
	if c.playerID == "" {
		return
	}

	content, _ := msg["content"].(string)
	channel, _ := msg["channel"].(string) // "lobby" or "world" (default)

	if content == "" {
		return
	}

	// Check for commands (only in world chat)
	if c.worldID != "" && channel != "lobby" {
		command, args, isCommand := c.server.gameServer.Chat.ParseCommand(content)
		if isCommand {
			c.handleChatCommand(command, args)
			return
		}
	}

	// Create chat message
	chatMsg, err := c.server.gameServer.Chat.CreateMessage(c.playerID, c.username, content, game.ChatMessageTypeNormal)
	if err != nil || chatMsg == nil {
		return // Spam or error
	}

	log.Printf("[CHAT] [%s] %s: %s", channel, c.username, chatMsg.Content)

	// Broadcast based on channel
	if channel == "lobby" || c.worldID == "" {
		// Broadcast to lobby
		c.server.BroadcastToLobby(map[string]interface{}{
			"type":     "chat_message",
			"chatType": "normal",
			"senderID": chatMsg.SenderID,
			"senderName": chatMsg.SenderName,
			"content":  chatMsg.Content,
		})
	} else {
		// Broadcast to all players in the world
		c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
			"type":    "chat_message",
			"message": chatMsg.Serialize(),
		})
	}
}

// handleChatCommand processes chat commands
func (c *Client) handleChatCommand(command string, args []string) {
	switch command {
	case "whisper", "w", "tell":
		if len(args) < 2 {
			c.sendSystemMessage("Usage: /whisper <player> <message>")
			return
		}
		targetName := args[0]
		message := joinArgs(args[1:])
		c.handleWhisper(targetName, message)

	case "me", "emote":
		if len(args) < 1 {
			c.sendSystemMessage("Usage: /me <action>")
			return
		}
		c.handleEmote(joinArgs(args))

	case "players", "who":
		c.handleListPlayers()

	default:
		c.sendSystemMessage("Unknown command: /" + command)
	}
}

// handleWhisper sends a private message to another player
func (c *Client) handleWhisper(targetName, content string) {
	// Find target player
	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		return
	}

	var targetID string
	players := world.GetPlayers()
	for _, p := range players {
		if p.Username == targetName {
			targetID = p.ID
			break
		}
	}

	if targetID == "" {
		c.sendSystemMessage("Player not found: " + targetName)
		return
	}

	chatMsg, err := c.server.gameServer.Chat.CreateWhisper(c.playerID, c.username, targetID, content)
	if err != nil || chatMsg == nil {
		return
	}

	// Send to target
	c.server.SendToPlayer(targetID, map[string]interface{}{
		"type":    "chat_message",
		"message": chatMsg.Serialize(),
	})

	// Send confirmation to sender
	c.Send(map[string]interface{}{
		"type":    "chat_message",
		"message": chatMsg.Serialize(),
	})
}

// handleEmote broadcasts an emote action
func (c *Client) handleEmote(action string) {
	chatMsg, _ := c.server.gameServer.Chat.CreateMessage(c.playerID, c.username, "* "+c.username+" "+action, game.ChatMessageTypeNormal)
	if chatMsg == nil {
		return
	}

	c.server.BroadcastToWorld(c.worldID, map[string]interface{}{
		"type":    "chat_message",
		"message": chatMsg.Serialize(),
	})
}

// handleListPlayers sends a list of players in the current world
func (c *Client) handleListPlayers() {
	world, ok := c.server.gameServer.GetWorld(c.worldID)
	if !ok {
		return
	}

	players := world.GetPlayers()
	names := make([]string, 0, len(players))
	for _, p := range players {
		names = append(names, p.Username)
	}

	c.sendSystemMessage(fmt.Sprintf("Players online (%d): %s", len(names), joinArgs(names)))
}

// sendSystemMessage sends a system message to the client
func (c *Client) sendSystemMessage(content string) {
	sysMsg := c.server.gameServer.Chat.CreateSystemMessage(content)
	c.Send(map[string]interface{}{
		"type":    "chat_message",
		"message": sysMsg.Serialize(),
	})
}

// joinArgs joins string arguments with spaces
func joinArgs(args []string) string {
	result := ""
	for i, arg := range args {
		if i > 0 {
			result += " "
		}
		result += arg
	}
	return result
}

// generateProjectileID creates a unique projectile ID
func generateProjectileID() string {
	return fmt.Sprintf("proj-%d", time.Now().UnixNano())
}

// Send queues a message to be sent to the client
func (c *Client) Send(message map[string]interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	select {
	case c.send <- data:
	default:
		log.Printf("Client send buffer full, dropping message")
	}
}

// Close gracefully closes the client connection
func (c *Client) Close() {
	close(c.send)

	// Save and remove player from world
	if c.worldID != "" && c.playerID != "" {
		if world, ok := c.server.gameServer.GetWorld(c.worldID); ok {
			// Save player data before removing
			player := world.GetPlayer(c.playerID)
			if player != nil {
				if err := c.server.gameServer.SavePlayer(player); err != nil {
					log.Printf("[SAVE] Error saving player %s on disconnect: %v", c.username, err)
				} else if config.Server.Debug.LogPlayerSaves {
					log.Printf("[SAVE] Saved player %s on disconnect", c.username)
				}
			}

			world.RemovePlayer(c.playerID)
			log.Printf("Player %s removed from world %s", c.playerID, c.worldID)
		}
	}
}

// Helper functions
func generatePlayerID() string {
	return fmt.Sprintf("p-%d", time.Now().UnixNano())
}

func getFloat64(m map[string]interface{}, key string) float64 {
	if val, ok := m[key].(float64); ok {
		return val
	}
	return 0.0
}
