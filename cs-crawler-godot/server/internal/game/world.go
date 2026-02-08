package game

import (
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
)

// World represents a game instance built on a hex board
type World struct {
	ID      string
	mu      sync.RWMutex
	created time.Time

	// Hex board (replaces old Level)
	Board *Board

	// Track which tile data each player has received
	playerTilesSent map[string]map[HexCoord]bool // playerID -> set of sent tile coords

	// Entities
	players     map[string]*Player
	enemies     map[string]*Enemy
	projectiles map[string]*Projectile
	minions     map[string]*Minion
	groundItems map[string]*GroundItem

	// Events (for broadcasting)
	damageEvents      []DamageEvent
	deathEvents       []DeathEvent
	abilityCastEvents []AbilityCastEvent

	// Item generation
	nextItemID int
}

// NewWorld creates a new game world with a hex board
func NewWorld(id string) *World {
	w := &World{
		ID:                id,
		created:           time.Now(),
		playerTilesSent:   make(map[string]map[HexCoord]bool),
		players:           make(map[string]*Player),
		enemies:           make(map[string]*Enemy),
		projectiles:       make(map[string]*Projectile),
		minions:           make(map[string]*Minion),
		groundItems:       make(map[string]*GroundItem),
		damageEvents:      make([]DamageEvent, 0),
		deathEvents:       make([]DeathEvent, 0),
		abilityCastEvents: make([]AbilityCastEvent, 0),
		nextItemID:        1,
	}

	// Generate hex board (3 rings = 37 tiles)
	seed := time.Now().UnixNano()
	w.Board = NewBoard(seed, 3)

	// Generate the town tile immediately
	w.Board.EnsureTileGenerated(HexCoord{Q: 0, R: 0, Layer: 0})

	log.Printf("[WORLD] Created hex world with %d tiles, seed: %d", len(w.Board.Tiles), seed)

	return w
}

// Update processes one world tick
func (w *World) Update(delta time.Duration) {
	w.mu.Lock()
	defer w.mu.Unlock()

	deltaSeconds := delta.Seconds()

	// Clear events from previous tick
	w.damageEvents = w.damageEvents[:0]
	w.deathEvents = w.deathEvents[:0]
	w.abilityCastEvents = w.abilityCastEvents[:0]

	// Update player tile tracking and generate/activate nearby tiles
	for _, player := range w.players {
		w.updatePlayerTiles(player)
	}

	// Update players
	for _, player := range w.players {
		player.Update(deltaSeconds)
	}

	// Update enemies with AI
	aiContext := &EnemyAIContext{
		Players:      w.players,
		Enemies:      w.enemies,
		DeltaSeconds: deltaSeconds,
		World:        w,
	}

	// Collect spawn requests to avoid modifying map during iteration
	var spawnRequests []SpawnEnemyRequest

	for _, enemy := range w.enemies {
		// Only update enemies in active tiles
		if !w.isEntityInActiveTile(enemy.Position, 0) {
			continue
		}

		attackResult := enemy.UpdateAI(aiContext)
		if attackResult == nil {
			continue
		}

		// Handle different attack results (same as before)
		if attackResult.IsExplosion {
			for _, player := range w.players {
				distance := Distance2D(enemy.Position, player.Position)
				if distance <= attackResult.ExplosionRadius {
					player.Health -= attackResult.Damage
					if player.Health < 0 {
						player.Health = 0
					}
					w.damageEvents = append(w.damageEvents, DamageEvent{
						TargetID: player.ID,
						Damage:   attackResult.Damage,
						Type:     attackResult.DamageType,
					})
				}
			}
			enemy.Dead = true
			enemy.Health = 0
			w.deathEvents = append(w.deathEvents, DeathEvent{
				EntityID:   enemy.ID,
				EntityType: "enemy",
				KillerID:   enemy.ID,
			})
		} else if attackResult.IsProjectile {
			projectileID := fmt.Sprintf("proj-enemy-%s-%d", enemy.ID, time.Now().UnixNano())
			projectile := NewEnemyProjectile(
				projectileID,
				enemy.ID,
				attackResult.Position,
				attackResult.Direction,
				attackResult.Damage,
				attackResult.DamageType,
			)
			w.projectiles[projectileID] = projectile
			w.abilityCastEvents = append(w.abilityCastEvents, AbilityCastEvent{
				CasterID:    enemy.ID,
				CasterType:  "enemy",
				OwnerID:     enemy.ID,
				AbilityType: "enemy_projectile",
				Position:    attackResult.Position,
				Direction:   attackResult.Direction,
			})
		} else if attackResult.ApplyBuff != nil {
			buff := attackResult.ApplyBuff
			for _, ally := range w.enemies {
				if ally.ID == enemy.ID || ally.Dead {
					continue
				}
				distance := Distance2D(enemy.Position, ally.Position)
				if distance <= buff.Radius {
					ally.ApplyBuff(buff.DamageMult, buff.SpeedMult, buff.Duration)
				}
			}
		} else if len(attackResult.SpawnEnemies) > 0 {
			spawnRequests = append(spawnRequests, attackResult.SpawnEnemies...)
		} else if attackResult.TargetID != "" {
			player, exists := w.players[attackResult.TargetID]
			if exists {
				damage := attackResult.Damage * enemy.DamageBuff
				player.Health -= damage
				if player.Health < 0 {
					player.Health = 0
				}
				w.damageEvents = append(w.damageEvents, DamageEvent{
					TargetID: player.ID,
					Damage:   damage,
					Type:     attackResult.DamageType,
				})
			}
		}
	}

	// Process spawn requests
	for _, spawn := range spawnRequests {
		enemyID := fmt.Sprintf("enemy-summon-%d", time.Now().UnixNano())
		newEnemy := NewEnemy(enemyID, spawn.Type, spawn.Position)
		w.enemies[enemyID] = newEnemy
	}

	// Update projectiles and check collisions
	for id, projectile := range w.projectiles {
		if projectile.IsHoming {
			var nearest *Enemy
			minDistance := 100.0
			for _, enemy := range w.enemies {
				if enemy.IsDead() {
					continue
				}
				distance := Distance2D(projectile.Position, enemy.Position)
				if distance < minDistance {
					minDistance = distance
					nearest = enemy
				}
			}
			if nearest != nil {
				projectile.UpdateHoming(nearest.Position, deltaSeconds)
			}
		}

		projectile.Update(deltaSeconds)

		if projectile.IsEnemyProjectile {
			for _, player := range w.players {
				if player.Health <= 0 {
					continue
				}
				distance := Distance2D(projectile.Position, player.Position)
				if distance <= projectile.Radius+0.5 {
					player.Health -= projectile.Damage
					if player.Health < 0 {
						player.Health = 0
					}
					w.damageEvents = append(w.damageEvents, DamageEvent{
						TargetID: player.ID,
						Damage:   projectile.Damage,
						Type:     projectile.DamageType,
					})
					delete(w.projectiles, id)
					break
				}
			}
			continue
		}

		if enemy := CheckProjectileCollision(projectile, w.enemies, projectile.Radius); enemy != nil {
			if projectile.HasHitEnemy(enemy.ID) {
				continue
			}

			damageInfo := DamageInfo{
				Amount:   projectile.Damage,
				Type:     projectile.DamageType,
				SourceID: projectile.OwnerID,
				TargetID: enemy.ID,
			}

			died := ApplyDamage(enemy, damageInfo)

			if projectile.StatusEffectInfo != nil {
				statusEffect := NewStatusEffect(
					projectile.StatusEffectInfo.Type,
					projectile.StatusEffectInfo.Duration,
					projectile.StatusEffectInfo.Magnitude,
					projectile.OwnerID,
				)
				enemy.ApplyStatusEffect(statusEffect)
			}

			w.damageEvents = append(w.damageEvents, DamageEvent{
				TargetID: enemy.ID,
				Damage:   damageInfo.Amount,
				Type:     damageInfo.Type,
			})

			if died {
				w.deathEvents = append(w.deathEvents, DeathEvent{
					EntityID:   enemy.ID,
					EntityType: "enemy",
					KillerID:   projectile.OwnerID,
				})
				w.dropLoot(enemy)
			}

			if projectile.IsPiercing {
				projectile.MarkEnemyHit(enemy.ID)
				if !projectile.CanPierce() {
					delete(w.projectiles, id)
				}
			} else {
				delete(w.projectiles, id)
			}
			continue
		}

		if projectile.ShouldDestroy() {
			delete(w.projectiles, id)
		}
	}

	// Update minions
	for id, minion := range w.minions {
		owner, ownerExists := w.players[minion.OwnerID]
		if !ownerExists {
			delete(w.minions, id)
			continue
		}

		minion.Update(deltaSeconds, owner.Position)

		if minion.CanCast() {
			target := minion.FindNearestEnemy(w.enemies, minion.Ability.Range)
			if target != nil {
				direction := minion.GetDirectionTo(target.Position)

				switch minion.Ability.Category {
				case AbilityCategoryProjectile:
					projectileID := fmt.Sprintf("proj-minion-%s-%d", id, time.Now().UnixNano())
					spawnPosition := minion.Position
					spawnPosition.Y = 0.5

					minionProjectile := NewProjectile(
						projectileID, minion.OwnerID, spawnPosition,
						Vector3{
							X: direction.X * minion.Ability.Speed,
							Y: 0,
							Z: direction.Z * minion.Ability.Speed,
						},
						minion.Ability.Damage, minion.Ability.DamageType,
						string(minion.AbilityType),
					)
					minionProjectile.StatusEffectInfo = minion.Ability.StatusEffect
					w.projectiles[projectileID] = minionProjectile

				case AbilityCategoryInstant:
					hitTargets := make([]string, 0)
					for _, enemy := range w.enemies {
						if CheckLineCollision(minion.Position, direction, minion.Ability.Range, minion.Ability.Radius, enemy) {
							damageInfo := DamageInfo{
								Amount: minion.Ability.Damage, Type: minion.Ability.DamageType,
								SourceID: minion.OwnerID, TargetID: enemy.ID,
							}
							died := ApplyDamage(enemy, damageInfo)
							hitTargets = append(hitTargets, enemy.ID)
							if minion.Ability.StatusEffect != nil {
								enemy.ApplyStatusEffect(NewStatusEffect(
									minion.Ability.StatusEffect.Type,
									minion.Ability.StatusEffect.Duration,
									minion.Ability.StatusEffect.Magnitude,
									minion.OwnerID,
								))
							}
							w.damageEvents = append(w.damageEvents, DamageEvent{TargetID: enemy.ID, Damage: damageInfo.Amount, Type: damageInfo.Type})
							if died {
								w.deathEvents = append(w.deathEvents, DeathEvent{EntityID: enemy.ID, EntityType: "enemy", KillerID: minion.OwnerID})
								w.dropLoot(enemy)
							}
						}
					}
					w.abilityCastEvents = append(w.abilityCastEvents, AbilityCastEvent{
						CasterID: id, CasterType: string(minion.Type), OwnerID: minion.OwnerID,
						AbilityType: string(minion.AbilityType), Position: minion.Position,
						Direction: direction, HitTargets: hitTargets,
					})

				case AbilityCategoryMelee:
					hitTargets := make([]string, 0)
					for _, enemy := range w.enemies {
						if CheckConeCollision(minion.Position, direction, minion.Ability.Range, minion.Ability.Angle, enemy) {
							damageInfo := DamageInfo{
								Amount: minion.Ability.Damage, Type: minion.Ability.DamageType,
								SourceID: minion.OwnerID, TargetID: enemy.ID,
							}
							died := ApplyDamage(enemy, damageInfo)
							hitTargets = append(hitTargets, enemy.ID)
							if minion.Ability.StatusEffect != nil {
								enemy.ApplyStatusEffect(NewStatusEffect(
									minion.Ability.StatusEffect.Type,
									minion.Ability.StatusEffect.Duration,
									minion.Ability.StatusEffect.Magnitude,
									minion.OwnerID,
								))
							}
							w.damageEvents = append(w.damageEvents, DamageEvent{TargetID: enemy.ID, Damage: damageInfo.Amount, Type: damageInfo.Type})
							if died {
								w.deathEvents = append(w.deathEvents, DeathEvent{EntityID: enemy.ID, EntityType: "enemy", KillerID: minion.OwnerID})
								w.dropLoot(enemy)
							}
						}
					}
					w.abilityCastEvents = append(w.abilityCastEvents, AbilityCastEvent{
						CasterID: id, CasterType: string(minion.Type), OwnerID: minion.OwnerID,
						AbilityType: string(minion.AbilityType), Position: minion.Position,
						Direction: direction, HitTargets: hitTargets,
					})
				}

				minion.MarkCasted()
			}
		}

		if minion.ShouldDestroy() {
			delete(w.minions, id)
		}
	}

	// Remove dead enemies after delay
	for id, enemy := range w.enemies {
		if enemy.IsDead() && time.Since(enemy.LastUpdate) > 2*time.Second {
			delete(w.enemies, id)
		}
	}

	// Respawn enemies in active tiles that have been cleared
	w.checkTileRespawns()
}

// updatePlayerTiles ensures tiles around a player are generated and tracks what
// tile data needs to be sent.
func (w *World) updatePlayerTiles(player *Player) {
	layer := 0 // TODO: determine from player Y position
	currentHex := WorldToHex(player.Position, layer)
	player.CurrentTile = currentHex

	// Ensure current tile and neighbors are generated
	coords := w.Board.GetActiveTilesForPlayer(player.Position, layer)
	for _, coord := range coords {
		tile := w.Board.EnsureTileGenerated(coord)
		if tile != nil {
			tile.Active = true
			if !tile.Explored {
				tile.Explored = true
			}
		}
	}
}

// isEntityInActiveTile checks if a world position is in an active tile
func (w *World) isEntityInActiveTile(pos Vector3, layer int) bool {
	coord := WorldToHex(pos, layer)
	tile := w.Board.GetTile(coord)
	return tile != nil && tile.Active
}

// checkTileRespawns checks tiles that need enemy respawning
func (w *World) checkTileRespawns() {
	// Build a map of which tiles have living enemies
	tilesWithEnemies := make(map[HexCoord]bool)
	for _, enemy := range w.enemies {
		if !enemy.IsDead() {
			coord := WorldToHex(enemy.Position, 0)
			tilesWithEnemies[coord] = true
		}
	}

	// Check active non-town tiles
	for coord, tile := range w.Board.Tiles {
		if !tile.Active || !tile.Generated {
			continue
		}
		if tile.TileType == TileTypeTown {
			continue
		}
		if tilesWithEnemies[coord] {
			continue
		}
		// No enemies in this active tile - check if there should be
		if len(tile.Spawns) > 0 {
			// Check if any player is nearby (within 2 hexes)
			playerNearby := false
			for _, player := range w.players {
				if HexDistance(WorldToHex(player.Position, 0), coord) <= 2 {
					playerNearby = true
					break
				}
			}
			if playerNearby {
				w.spawnTileEnemies(tile)
			}
		}
	}
}

// spawnTileEnemies spawns enemies for a single tile based on its spawn points
func (w *World) spawnTileEnemies(tile *Tile) {
	spawnTime := time.Now().UnixNano()
	count := 0

	for spawnIdx, spawn := range tile.Spawns {
		for i := 0; i < spawn.Count; i++ {
			enemyType := spawn.EnemyTypes[rand.Intn(len(spawn.EnemyTypes))]
			offsetX := (rand.Float64() - 0.5) * 3.0
			offsetZ := (rand.Float64() - 0.5) * 3.0

			pos := Vector3{
				X: spawn.Position.X + offsetX,
				Y: spawn.Position.Y,
				Z: spawn.Position.Z + offsetZ,
			}

			enemyID := fmt.Sprintf("enemy-%d-tile-%d-%d-%d", spawnTime, tile.Coord.Q, spawnIdx, i)
			enemy := NewEnemy(enemyID, enemyType, pos)
			w.enemies[enemyID] = enemy
			count++
		}
	}

	if count > 0 {
		log.Printf("[WORLD] Spawned %d enemies in tile (%d,%d)", count, tile.Coord.Q, tile.Coord.R)
	}
}

// GetNewTilesForPlayer returns tiles that need to be sent to a player
// (tiles in their vicinity that haven't been sent yet).
func (w *World) GetNewTilesForPlayer(playerID string) []*Tile {
	w.mu.RLock()
	defer w.mu.RUnlock()

	player, ok := w.players[playerID]
	if !ok {
		return nil
	}

	sent := w.playerTilesSent[playerID]
	if sent == nil {
		sent = make(map[HexCoord]bool)
		w.playerTilesSent[playerID] = sent
	}

	layer := 0
	coords := w.Board.GetActiveTilesForPlayer(player.Position, layer)
	var newTiles []*Tile

	for _, coord := range coords {
		if sent[coord] {
			continue
		}
		tile := w.Board.GetTile(coord)
		if tile != nil && tile.Generated {
			newTiles = append(newTiles, tile)
			sent[coord] = true
		}
	}

	return newTiles
}

// AddPlayer adds a player to the world
func (w *World) AddPlayer(player *Player) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.players[player.ID] = player

	// Set player spawn position to town center
	if w.Board != nil {
		player.Position = w.Board.GetSpawnPoint()
		player.Position.Y = 0
		player.CurrentTile = HexCoord{Q: 0, R: 0, Layer: 0}
	}

	// Initialize tile tracking for this player
	w.playerTilesSent[player.ID] = make(map[HexCoord]bool)
}

// GetBoardData returns the board summary for a newly joined player
func (w *World) GetBoardData() map[string]interface{} {
	w.mu.RLock()
	defer w.mu.RUnlock()

	if w.Board == nil {
		return nil
	}

	return w.Board.SerializeBoardSummary()
}

// GetPlayer returns a specific player by ID
func (w *World) GetPlayer(playerID string) *Player {
	w.mu.RLock()
	defer w.mu.RUnlock()

	return w.players[playerID]
}

// RemovePlayer removes a player from the world
func (w *World) RemovePlayer(playerID string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	delete(w.players, playerID)
	delete(w.playerTilesSent, playerID)
}

// GetPlayers returns all players (thread-safe copy)
func (w *World) GetPlayers() map[string]*Player {
	w.mu.RLock()
	defer w.mu.RUnlock()

	players := make(map[string]*Player, len(w.players))
	for k, v := range w.players {
		players[k] = v
	}
	return players
}

// AddProjectile adds a projectile to the world
func (w *World) AddProjectile(projectile *Projectile) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.projectiles[projectile.ID] = projectile
}

// AddMinion adds a minion to the world
func (w *World) AddMinion(minion *Minion) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.minions[minion.ID] = minion
}

// GetEnemies returns all enemies (thread-safe copy)
func (w *World) GetEnemies() map[string]*Enemy {
	w.mu.RLock()
	defer w.mu.RUnlock()

	enemies := make(map[string]*Enemy, len(w.enemies))
	for k, v := range w.enemies {
		enemies[k] = v
	}
	return enemies
}

// GetEvents returns damage, death, and ability cast events from this tick
func (w *World) GetEvents() ([]DamageEvent, []DeathEvent, []AbilityCastEvent) {
	w.mu.RLock()
	defer w.mu.RUnlock()

	damages := make([]DamageEvent, len(w.damageEvents))
	copy(damages, w.damageEvents)

	deaths := make([]DeathEvent, len(w.deathEvents))
	copy(deaths, w.deathEvents)

	abilityCasts := make([]AbilityCastEvent, len(w.abilityCastEvents))
	copy(abilityCasts, w.abilityCastEvents)

	return damages, deaths, abilityCasts
}

// GetWorldStateForPlayer returns world state scoped to a player's vicinity.
// Only includes entities within the player's active tiles.
func (w *World) GetWorldStateForPlayer(playerID string) map[string]interface{} {
	w.mu.RLock()
	defer w.mu.RUnlock()

	player, ok := w.players[playerID]
	if !ok {
		return nil
	}

	// Get active tile coords for this player
	layer := 0
	activeTiles := make(map[HexCoord]bool)
	for _, coord := range w.Board.GetActiveTilesForPlayer(player.Position, layer) {
		activeTiles[coord] = true
	}

	// Filter entities to those in active tiles
	players := make([]map[string]interface{}, 0)
	for _, p := range w.players {
		pCoord := WorldToHex(p.Position, layer)
		if activeTiles[pCoord] {
			players = append(players, p.Serialize())
		}
	}

	enemies := make([]map[string]interface{}, 0)
	for _, e := range w.enemies {
		eCoord := WorldToHex(e.Position, layer)
		if activeTiles[eCoord] {
			enemies = append(enemies, e.Serialize())
		}
	}

	projectiles := make([]map[string]interface{}, 0)
	for _, proj := range w.projectiles {
		pCoord := WorldToHex(proj.Position, layer)
		if activeTiles[pCoord] {
			projectiles = append(projectiles, proj.Serialize())
		}
	}

	minions := make([]map[string]interface{}, 0)
	for _, minion := range w.minions {
		mCoord := WorldToHex(minion.Position, layer)
		if activeTiles[mCoord] {
			minions = append(minions, minion.Serialize())
		}
	}

	// Filter events too
	damageEvents := make([]map[string]interface{}, 0)
	for _, event := range w.damageEvents {
		damageEvents = append(damageEvents, map[string]interface{}{
			"targetID": event.TargetID,
			"damage":   event.Damage,
			"type":     string(event.Type),
		})
	}

	deathEvents := make([]map[string]interface{}, 0)
	for _, event := range w.deathEvents {
		deathEvents = append(deathEvents, map[string]interface{}{
			"entityID":   event.EntityID,
			"entityType": event.EntityType,
			"killerID":   event.KillerID,
		})
	}

	abilityCastEvents := make([]map[string]interface{}, 0)
	for _, event := range w.abilityCastEvents {
		abilityCastEvents = append(abilityCastEvents, map[string]interface{}{
			"casterID":    event.CasterID,
			"casterType":  event.CasterType,
			"ownerID":     event.OwnerID,
			"abilityType": event.AbilityType,
			"position":    event.Position,
			"direction":   event.Direction,
			"hitTargets":  event.HitTargets,
		})
	}

	groundItems := make([]map[string]interface{}, 0)
	for _, groundItem := range w.groundItems {
		giCoord := WorldToHex(groundItem.Position, layer)
		if activeTiles[giCoord] {
			groundItems = append(groundItems, groundItem.Serialize())
		}
	}

	return map[string]interface{}{
		"players":           players,
		"enemies":           enemies,
		"projectiles":       projectiles,
		"minions":           minions,
		"groundItems":       groundItems,
		"damageEvents":      damageEvents,
		"deathEvents":       deathEvents,
		"abilityCastEvents": abilityCastEvents,
	}
}

// GetWorldState returns full world state (kept for backwards compatibility during transition)
func (w *World) GetWorldState() map[string]interface{} {
	w.mu.RLock()
	defer w.mu.RUnlock()

	players := make([]map[string]interface{}, 0, len(w.players))
	for _, p := range w.players {
		players = append(players, p.Serialize())
	}

	enemies := make([]map[string]interface{}, 0, len(w.enemies))
	for _, e := range w.enemies {
		enemies = append(enemies, e.Serialize())
	}

	projectiles := make([]map[string]interface{}, 0, len(w.projectiles))
	for _, proj := range w.projectiles {
		projectiles = append(projectiles, proj.Serialize())
	}

	minions := make([]map[string]interface{}, 0, len(w.minions))
	for _, minion := range w.minions {
		minions = append(minions, minion.Serialize())
	}

	damageEvents := make([]map[string]interface{}, 0, len(w.damageEvents))
	for _, event := range w.damageEvents {
		damageEvents = append(damageEvents, map[string]interface{}{
			"targetID": event.TargetID,
			"damage":   event.Damage,
			"type":     string(event.Type),
		})
	}

	deathEvents := make([]map[string]interface{}, 0, len(w.deathEvents))
	for _, event := range w.deathEvents {
		deathEvents = append(deathEvents, map[string]interface{}{
			"entityID":   event.EntityID,
			"entityType": event.EntityType,
			"killerID":   event.KillerID,
		})
	}

	abilityCastEvents := make([]map[string]interface{}, 0, len(w.abilityCastEvents))
	for _, event := range w.abilityCastEvents {
		abilityCastEvents = append(abilityCastEvents, map[string]interface{}{
			"casterID":    event.CasterID,
			"casterType":  event.CasterType,
			"ownerID":     event.OwnerID,
			"abilityType": event.AbilityType,
			"position":    event.Position,
			"direction":   event.Direction,
			"hitTargets":  event.HitTargets,
		})
	}

	groundItems := make([]map[string]interface{}, 0, len(w.groundItems))
	for _, groundItem := range w.groundItems {
		groundItems = append(groundItems, groundItem.Serialize())
	}

	return map[string]interface{}{
		"players":           players,
		"enemies":           enemies,
		"projectiles":       projectiles,
		"minions":           minions,
		"groundItems":       groundItems,
		"damageEvents":      damageEvents,
		"deathEvents":       deathEvents,
		"abilityCastEvents": abilityCastEvents,
	}
}

// dropLoot creates loot when an enemy dies
func (w *World) dropLoot(enemy *Enemy) {
	if rand.Float64() > 0.7 {
		return
	}

	itemLevel := 1
	itemTypes := []ItemType{
		ItemTypeWeapon1H, ItemTypeWeapon2H,
		ItemTypeHead, ItemTypeChest, ItemTypeHands, ItemTypeFeet,
		ItemTypeAmulet, ItemTypeRing,
	}
	itemType := itemTypes[rand.Intn(len(itemTypes))]

	itemID := fmt.Sprintf("item-%d", w.nextItemID)
	w.nextItemID++

	item := NewItem(itemID, itemType, itemLevel)

	dropPos := w.findOpenDropPosition(enemy.Position)
	groundItemID := fmt.Sprintf("ground-%d", time.Now().UnixNano())
	groundItem := NewGroundItem(groundItemID, item, dropPos)

	w.groundItems[groundItemID] = groundItem
	if config.Server.Debug.LogItemDrops {
		log.Printf("[WORLD] Dropped loot: %s (%s) at position %v", item.Name, item.Rarity, dropPos)
	}
}

func (w *World) findOpenDropPosition(origin Vector3) Vector3 {
	const minDist = 0.8
	const gridStep = 1.0

	if w.isDropPositionClear(origin, minDist) {
		return origin
	}

	for ring := 1; ring <= 6; ring++ {
		for x := -ring; x <= ring; x++ {
			for z := -ring; z <= ring; z++ {
				if abs(x) != ring && abs(z) != ring {
					continue
				}
				candidate := Vector3{
					X: origin.X + float64(x)*gridStep,
					Y: origin.Y,
					Z: origin.Z + float64(z)*gridStep,
				}
				if w.isDropPositionClear(candidate, minDist) {
					return candidate
				}
			}
		}
	}

	return Vector3{
		X: origin.X + (rand.Float64()-0.5)*3.0,
		Y: origin.Y,
		Z: origin.Z + (rand.Float64()-0.5)*3.0,
	}
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func (w *World) isDropPositionClear(pos Vector3, minDist float64) bool {
	for _, gi := range w.groundItems {
		dx := gi.Position.X - pos.X
		dz := gi.Position.Z - pos.Z
		if dx*dx+dz*dz < minDist*minDist {
			return false
		}
	}
	return true
}

// PickupItem allows a player to pick up a ground item
func (w *World) PickupItem(playerID, groundItemID string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	player, exists := w.players[playerID]
	if !exists {
		return fmt.Errorf("player not found")
	}

	groundItem, exists := w.groundItems[groundItemID]
	if !exists {
		return fmt.Errorf("ground item not found")
	}

	distance := Distance2D(player.Position, groundItem.Position)
	if distance > 3.0 {
		return fmt.Errorf("too far from item")
	}

	item := groundItem.Item
	autoEquipped := false

	if player.Inventory != nil {
		slot, err := player.Inventory.getEquipmentSlot(item)
		if err == nil && player.Inventory.Equipment[slot] == nil {
			_, equipErr := player.EquipItem(item)
			if equipErr == nil {
				autoEquipped = true
				if config.Server.Debug.LogItemPickups {
					log.Printf("[WORLD] Player %s auto-equipped %s to slot %s", playerID, item.Name, slot)
				}
			}
		}
	}

	if !autoEquipped {
		if player.Inventory.IsFull() {
			return fmt.Errorf("inventory is full")
		}

		_, err := player.Inventory.AddToBag(item)
		if err != nil {
			return err
		}
	}

	delete(w.groundItems, groundItemID)
	if config.Server.Debug.LogItemPickups {
		log.Printf("[WORLD] Player %s picked up %s (auto-equipped: %v)", playerID, item.Name, autoEquipped)
	}

	return nil
}

// SwapBagItems swaps two items in a player's bag
func (w *World) SwapBagItems(playerID string, from, to int) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	player, exists := w.players[playerID]
	if !exists {
		return fmt.Errorf("player not found")
	}

	return player.Inventory.SwapBagItems(from, to)
}

// SwapEquipmentItems swaps two equipped items
func (w *World) SwapEquipmentItems(playerID string, from, to EquipmentSlot) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	player, exists := w.players[playerID]
	if !exists {
		return fmt.Errorf("player not found")
	}

	return player.Inventory.SwapEquipmentItems(from, to)
}

// DropItemFromInventory removes an item from inventory and places it on the ground
func (w *World) DropItemFromInventory(playerID string, source string, slotRaw interface{}) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	player, exists := w.players[playerID]
	if !exists {
		return fmt.Errorf("player not found")
	}

	var item *Item

	switch source {
	case "bag":
		slotIdx := int(slotRaw.(float64))
		var err error
		item, err = player.Inventory.RemoveFromBag(slotIdx)
		if err != nil {
			return err
		}
	case "equipment":
		slotName := slotRaw.(string)
		var err error
		item, err = player.Inventory.UnequipItem(EquipmentSlot(slotName))
		if err != nil {
			return err
		}
		player.RecalculateStats()
	default:
		return fmt.Errorf("invalid source: %s", source)
	}

	dropPos := w.findOpenDropPosition(player.Position)
	groundItemID := fmt.Sprintf("ground-%d", time.Now().UnixNano())
	groundItem := NewGroundItem(groundItemID, item, dropPos)
	w.groundItems[groundItemID] = groundItem

	if config.Server.Debug.LogItemDrops {
		log.Printf("[WORLD] Player %s dropped %s on ground", playerID, item.Name)
	}
	return nil
}
