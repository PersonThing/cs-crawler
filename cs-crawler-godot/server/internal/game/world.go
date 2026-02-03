package game

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
)

// World represents a game instance
type World struct {
	ID      string
	mu      sync.RWMutex
	created time.Time

	// Procedural level
	Level         *Level
	levelSent     map[string]bool // Track which players have received level data

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

// NewWorld creates a new game world
func NewWorld(id string) *World {
	w := &World{
		ID:                id,
		created:           time.Now(),
		levelSent:         make(map[string]bool),
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

	// Generate procedural level
	seed := time.Now().UnixNano()
	levelGen := NewLevelGenerator(seed)
	w.Level = levelGen.GenerateLevel(100.0, 100.0, 4) // 100x100 world, ~8-12 rooms

	log.Printf("[WORLD] Generated level with %d rooms, seed: %d", len(w.Level.Rooms), seed)

	// Spawn enemies based on level spawn points
	w.spawnLevelEnemies()

	return w
}

// spawnLevelEnemies spawns enemies based on the procedural level
func (w *World) spawnLevelEnemies() {
	if w.Level == nil {
		log.Println("[WORLD] No level data, using fallback spawning")
		w.spawnInitialEnemies()
		return
	}

	spawnTime := time.Now().UnixNano()
	enemyCount := 0

	for _, room := range w.Level.Rooms {
		for spawnIdx, spawn := range room.EnemySpawns {
			for i := 0; i < spawn.Count; i++ {
				// Pick random enemy type from spawn point
				enemyType := spawn.EnemyTypes[rand.Intn(len(spawn.EnemyTypes))]

				// Spread enemies around spawn position
				offsetX := (rand.Float64() - 0.5) * 3.0
				offsetZ := (rand.Float64() - 0.5) * 3.0

				pos := Vector3{
					X: spawn.Position.X + offsetX,
					Y: spawn.Position.Y,
					Z: spawn.Position.Z + offsetZ,
				}

				enemyID := fmt.Sprintf("enemy-%d-%s-%d-%d", spawnTime, room.ID, spawnIdx, i)
				enemy := NewEnemy(enemyID, enemyType, pos)
				w.enemies[enemyID] = enemy
				enemyCount++
			}
		}
	}

	log.Printf("[WORLD] Spawned %d enemies from level spawn points", enemyCount)
}

// spawnInitialEnemies spawns starting enemies in the world
func (w *World) spawnInitialEnemies() {
	// Load spawn pattern from config
	pattern, ok := config.GetSpawnPattern("default")
	if !ok {
		log.Println("[WORLD] Spawn pattern 'default' not found, using fallback")
		w.spawnCirclePattern(5, "basic", 10.0, Vector3{X: 0, Y: 0, Z: 0})
		return
	}

	// Spawn based on pattern type
	switch pattern.Pattern {
	case "circle":
		center := Vector3{X: 0, Y: 0, Z: 0}
		if len(pattern.CenterPosition) >= 3 {
			center = Vector3{
				X: pattern.CenterPosition[0],
				Y: pattern.CenterPosition[1],
				Z: pattern.CenterPosition[2],
			}
		}
		w.spawnCirclePattern(pattern.Count, pattern.EnemyType, pattern.Radius, center)
	case "grid":
		w.spawnGridPattern(pattern)
	default:
		log.Printf("[WORLD] Unknown spawn pattern: %s", pattern.Pattern)
	}
}

// spawnCirclePattern spawns enemies in a circle
func (w *World) spawnCirclePattern(count int, enemyType string, radius float64, center Vector3) {
	for i := 0; i < count; i++ {
		angle := float64(i) * (2 * math.Pi / float64(count))
		x := center.X + radius*math.Cos(angle)
		z := center.Z + radius*math.Sin(angle)

		// Generate unique enemy ID using timestamp to avoid ID collisions during respawns
		enemy := NewEnemy(
			fmt.Sprintf("enemy-%d-%d", time.Now().UnixNano(), i),
			enemyType,
			Vector3{X: x, Y: center.Y, Z: z},
		)
		w.enemies[enemy.ID] = enemy
	}
	log.Printf("[WORLD] Spawned %d enemies in circle pattern", count)
}

// spawnGridPattern spawns enemies in a grid
func (w *World) spawnGridPattern(pattern *config.SpawnPattern) {
	if len(pattern.EnemyTypes) == 0 {
		log.Println("[WORLD] Grid pattern requires enemyTypes")
		return
	}

	enemyIndex := 0
	spawnTime := time.Now().UnixNano()
	for row := 0; row < pattern.Rows; row++ {
		for col := 0; col < pattern.Columns; col++ {
			x := float64(col) * pattern.Spacing
			z := float64(row) * pattern.Spacing

			enemyType := pattern.EnemyTypes[enemyIndex%len(pattern.EnemyTypes)]
			// Generate unique enemy ID using timestamp to avoid ID collisions during respawns
			enemy := NewEnemy(
				fmt.Sprintf("enemy-grid-%d-%d-%d", spawnTime, row, col),
				enemyType,
				Vector3{X: x, Y: 0, Z: z},
			)
			w.enemies[enemy.ID] = enemy
			enemyIndex++
		}
	}
	log.Printf("[WORLD] Spawned %d enemies in grid pattern", pattern.Rows*pattern.Columns)
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
		// Run AI and get attack result
		attackResult := enemy.UpdateAI(aiContext)
		if attackResult == nil {
			continue
		}

		// Handle different attack results
		if attackResult.IsExplosion {
			// Exploder enemy - deal AoE damage to all players in radius
			for _, player := range w.players {
				distance := Distance2D(enemy.Position, player.Position)
				if distance <= attackResult.ExplosionRadius {
					// Deal damage to player
					player.Health -= attackResult.Damage
					if player.Health < 0 {
						player.Health = 0
					}
					// Record damage event
					w.damageEvents = append(w.damageEvents, DamageEvent{
						TargetID: player.ID,
						Damage:   attackResult.Damage,
						Type:     attackResult.DamageType,
					})
				}
			}
			// Kill the exploder
			enemy.Dead = true
			enemy.Health = 0
			w.deathEvents = append(w.deathEvents, DeathEvent{
				EntityID:   enemy.ID,
				EntityType: "enemy",
				KillerID:   enemy.ID, // Self-destruct
			})
		} else if attackResult.IsProjectile {
			// Spawn enemy projectile towards player
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
			// Record ability cast event
			w.abilityCastEvents = append(w.abilityCastEvents, AbilityCastEvent{
				CasterID:    enemy.ID,
				CasterType:  "enemy",
				OwnerID:     enemy.ID,
				AbilityType: "enemy_projectile",
				Position:    attackResult.Position,
				Direction:   attackResult.Direction,
			})
		} else if attackResult.ApplyBuff != nil {
			// Support enemy - buff nearby allies
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
			// Summoner enemy - queue spawn requests
			spawnRequests = append(spawnRequests, attackResult.SpawnEnemies...)
		} else if attackResult.TargetID != "" {
			// Melee attack - deal direct damage to player
			player, exists := w.players[attackResult.TargetID]
			if exists {
				// Apply damage with buff multiplier
				damage := attackResult.Damage * enemy.DamageBuff
				player.Health -= damage
				if player.Health < 0 {
					player.Health = 0
				}
				// Record damage event
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
		// Update homing projectiles
		if projectile.IsHoming {
			// Find nearest enemy
			var nearest *Enemy
			minDistance := 100.0 // Max homing range
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

		// Check if this is an enemy projectile (hits players)
		if projectile.IsEnemyProjectile {
			// Check collision with players
			for _, player := range w.players {
				if player.Health <= 0 {
					continue
				}
				distance := Distance2D(projectile.Position, player.Position)
				if distance <= projectile.Radius+0.5 { // Player radius ~0.5
					// Deal damage to player
					player.Health -= projectile.Damage
					if player.Health < 0 {
						player.Health = 0
					}
					// Record damage event
					w.damageEvents = append(w.damageEvents, DamageEvent{
						TargetID: player.ID,
						Damage:   projectile.Damage,
						Type:     projectile.DamageType,
					})
					// Destroy projectile
					delete(w.projectiles, id)
					break
				}
			}
			continue
		}

		// Check collision with enemies (player projectiles)
		if enemy := CheckProjectileCollision(projectile, w.enemies, projectile.Radius); enemy != nil {
			// Skip if already hit this enemy (for piercing projectiles)
			if projectile.HasHitEnemy(enemy.ID) {
				continue
			}

			// Apply damage
			damageInfo := DamageInfo{
				Amount:   projectile.Damage,
				Type:     projectile.DamageType,
				SourceID: projectile.OwnerID,
				TargetID: enemy.ID,
			}

			died := ApplyDamage(enemy, damageInfo)

			// Apply status effect if projectile has one
			if projectile.StatusEffectInfo != nil {
				statusEffect := NewStatusEffect(
					projectile.StatusEffectInfo.Type,
					projectile.StatusEffectInfo.Duration,
					projectile.StatusEffectInfo.Magnitude,
					projectile.OwnerID,
				)
				enemy.ApplyStatusEffect(statusEffect)
			}

			// Record damage event
			w.damageEvents = append(w.damageEvents, DamageEvent{
				TargetID: enemy.ID,
				Damage:   damageInfo.Amount,
				Type:     damageInfo.Type,
			})

			// Record death event if enemy died
			if died {
				w.deathEvents = append(w.deathEvents, DeathEvent{
					EntityID:   enemy.ID,
					EntityType: "enemy",
					KillerID:   projectile.OwnerID,
				})
				// Drop loot
				w.dropLoot(enemy)
			}

			// Handle piercing
			if projectile.IsPiercing {
				projectile.MarkEnemyHit(enemy.ID)
				if !projectile.CanPierce() {
					delete(w.projectiles, id)
				}
			} else {
				// Destroy projectile on hit (non-piercing)
				delete(w.projectiles, id)
			}
			continue
		}

		// Destroy projectile if lifetime expired
		if projectile.ShouldDestroy() {
			delete(w.projectiles, id)
		}
	}

	// Update minions
	for id, minion := range w.minions {
		// Get owner position
		owner, ownerExists := w.players[minion.OwnerID]
		if !ownerExists {
			// Owner disconnected, remove minion
			delete(w.minions, id)
			continue
		}

		// Update minion (movement for pets)
		minion.Update(deltaSeconds, owner.Position)

		// Check if minion can cast
		if minion.CanCast() {
			// Find nearest enemy
			target := minion.FindNearestEnemy(w.enemies, minion.Ability.Range)
			if target != nil {
				// Minion casts ability towards target
				direction := minion.GetDirectionTo(target.Position)

				// Handle ability based on category
				switch minion.Ability.Category {
				case AbilityCategoryProjectile:
					// Create projectile from minion
					projectileID := fmt.Sprintf("proj-minion-%s-%d", id, time.Now().UnixNano())
					spawnPosition := minion.Position
					spawnPosition.Y = 0.5 // Lower than player projectiles

					minionProjectile := NewProjectile(
						projectileID,
						minion.OwnerID, // Credit owner for damage
						spawnPosition,
						Vector3{
							X: direction.X * minion.Ability.Speed,
							Y: 0,
							Z: direction.Z * minion.Ability.Speed,
						},
						minion.Ability.Damage,
						minion.Ability.DamageType,
						string(minion.AbilityType),
					)

					minionProjectile.StatusEffectInfo = minion.Ability.StatusEffect
					w.projectiles[projectileID] = minionProjectile

				case AbilityCategoryInstant:
					// Instant ability (e.g., Lightning) - check line collision immediately
					hitTargets := make([]string, 0)
					for _, enemy := range w.enemies {
						if CheckLineCollision(minion.Position, direction, minion.Ability.Range, minion.Ability.Radius, enemy) {
							damageInfo := DamageInfo{
								Amount:   minion.Ability.Damage,
								Type:     minion.Ability.DamageType,
								SourceID: minion.OwnerID,
								TargetID: enemy.ID,
							}

							died := ApplyDamage(enemy, damageInfo)
							hitTargets = append(hitTargets, enemy.ID)

							// Apply status effect if present
							if minion.Ability.StatusEffect != nil {
								statusEffect := NewStatusEffect(
									minion.Ability.StatusEffect.Type,
									minion.Ability.StatusEffect.Duration,
									minion.Ability.StatusEffect.Magnitude,
									minion.OwnerID,
								)
								enemy.ApplyStatusEffect(statusEffect)
							}

							// Record damage event
							w.damageEvents = append(w.damageEvents, DamageEvent{
								TargetID: enemy.ID,
								Damage:   damageInfo.Amount,
								Type:     damageInfo.Type,
							})

							// Record death event if enemy died
							if died {
								w.deathEvents = append(w.deathEvents, DeathEvent{
									EntityID:   enemy.ID,
									EntityType: "enemy",
									KillerID:   minion.OwnerID,
								})
								// Drop loot
								w.dropLoot(enemy)
							}
						}
					}

					// Record ability cast event
					w.abilityCastEvents = append(w.abilityCastEvents, AbilityCastEvent{
						CasterID:    id,
						CasterType:  string(minion.Type),
						OwnerID:     minion.OwnerID,
						AbilityType: string(minion.AbilityType),
						Position:    minion.Position,
						Direction:   direction,
						HitTargets:  hitTargets,
					})

				case AbilityCategoryMelee:
					// Melee ability (e.g., BasicAttack) - check cone collision immediately
					hitTargets := make([]string, 0)
					for _, enemy := range w.enemies {
						if CheckConeCollision(minion.Position, direction, minion.Ability.Range, minion.Ability.Angle, enemy) {
							damageInfo := DamageInfo{
								Amount:   minion.Ability.Damage,
								Type:     minion.Ability.DamageType,
								SourceID: minion.OwnerID,
								TargetID: enemy.ID,
							}

							died := ApplyDamage(enemy, damageInfo)
							hitTargets = append(hitTargets, enemy.ID)

							// Apply status effect if present
							if minion.Ability.StatusEffect != nil {
								statusEffect := NewStatusEffect(
									minion.Ability.StatusEffect.Type,
									minion.Ability.StatusEffect.Duration,
									minion.Ability.StatusEffect.Magnitude,
									minion.OwnerID,
								)
								enemy.ApplyStatusEffect(statusEffect)
							}

							// Record damage event
							w.damageEvents = append(w.damageEvents, DamageEvent{
								TargetID: enemy.ID,
								Damage:   damageInfo.Amount,
								Type:     damageInfo.Type,
							})

							// Record death event if enemy died
							if died {
								w.deathEvents = append(w.deathEvents, DeathEvent{
									EntityID:   enemy.ID,
									EntityType: "enemy",
									KillerID:   minion.OwnerID,
								})
								// Drop loot
								w.dropLoot(enemy)
							}
						}
					}

					// Record ability cast event
					w.abilityCastEvents = append(w.abilityCastEvents, AbilityCastEvent{
						CasterID:    id,
						CasterType:  string(minion.Type),
						OwnerID:     minion.OwnerID,
						AbilityType: string(minion.AbilityType),
						Position:    minion.Position,
						Direction:   direction,
						HitTargets:  hitTargets,
					})
				}

				minion.MarkCasted()
			}
		}

		// Remove minion if expired
		if minion.ShouldDestroy() {
			delete(w.minions, id)
		}
	}

	// Remove dead enemies (with a small delay to allow client to show death)
	for id, enemy := range w.enemies {
		if enemy.IsDead() && time.Since(enemy.LastUpdate) > 2*time.Second {
			delete(w.enemies, id)
		}
	}

	// Check if all remaining enemies are dead or if there are no enemies (for respawning)
	if len(w.enemies) == 0 {
		log.Println("[WORLD] All enemies removed, respawning...")
		w.spawnLevelEnemies()
	} else {
		allDead := true
		for _, enemy := range w.enemies {
			if !enemy.IsDead() {
				allDead = false
				break
			}
		}
		// If all remaining enemies are dead (waiting for removal), respawn now
		if allDead {
			log.Println("[WORLD] All enemies dead (waiting for cleanup), respawning...")
			// Clear dead enemies immediately
			for id := range w.enemies {
				delete(w.enemies, id)
			}
			w.spawnLevelEnemies()
		}
	}
}

// AddPlayer adds a player to the world
func (w *World) AddPlayer(player *Player) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.players[player.ID] = player

	// Set player spawn position based on level
	if w.Level != nil {
		player.Position = w.Level.SpawnPoint
		player.Position.Y = 0
	}
}

// NeedsLevelData returns true if a player hasn't received level data yet
func (w *World) NeedsLevelData(playerID string) bool {
	w.mu.RLock()
	defer w.mu.RUnlock()

	return !w.levelSent[playerID]
}

// MarkLevelSent marks that a player has received level data
func (w *World) MarkLevelSent(playerID string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.levelSent[playerID] = true
}

// GetLevelData returns the serialized level data
func (w *World) GetLevelData() map[string]interface{} {
	w.mu.RLock()
	defer w.mu.RUnlock()

	if w.Level == nil {
		return nil
	}

	return w.Level.Serialize()
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

// GetWorldState returns serializable world state
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

	// Include events
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

	// Serialize ground items
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
	// Drop chance (70% to drop an item)
	if rand.Float64() > 0.7 {
		return
	}

	// Generate item based on enemy level (for now, use fixed level 1)
	itemLevel := 1

	// Random item type
	itemTypes := []ItemType{
		ItemTypeWeapon1H, ItemTypeWeapon2H,
		ItemTypeHead, ItemTypeChest, ItemTypeHands, ItemTypeFeet,
		ItemTypeAmulet, ItemTypeRing,
	}
	itemType := itemTypes[rand.Intn(len(itemTypes))]

	// Generate item
	itemID := fmt.Sprintf("item-%d", w.nextItemID)
	w.nextItemID++

	item := NewItem(itemID, itemType, itemLevel)

	// Create ground item near enemy position, spread out from other items
	dropPos := w.findOpenDropPosition(enemy.Position)
	groundItemID := fmt.Sprintf("ground-%d", time.Now().UnixNano())
	groundItem := NewGroundItem(groundItemID, item, dropPos)

	w.groundItems[groundItemID] = groundItem
	if config.Server.Debug.LogItemDrops {
		log.Printf("[WORLD] Dropped loot: %s (%s) at position %v", item.Name, item.Rarity, dropPos)
	}
}

// findOpenDropPosition finds a nearby position that doesn't overlap existing ground items
func (w *World) findOpenDropPosition(origin Vector3) Vector3 {
	const minDist = 0.8  // Minimum distance between ground items
	const gridStep = 1.0 // Grid spacing

	// Check if origin is clear
	if w.isDropPositionClear(origin, minDist) {
		return origin
	}

	// Grid-based search expanding outward in rings
	for ring := 1; ring <= 6; ring++ {
		for x := -ring; x <= ring; x++ {
			for z := -ring; z <= ring; z++ {
				// Only check cells on the current ring's edge
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

	// Fallback: random offset
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

	// Check if player is close enough to pick up
	distance := Distance2D(player.Position, groundItem.Position)
	if distance > 3.0 {
		return fmt.Errorf("too far from item")
	}

	// Try to auto-equip if the matching slot is empty
	item := groundItem.Item
	autoEquipped := false

	if player.Inventory != nil {
		slot, err := player.Inventory.getEquipmentSlot(item)
		if err == nil && player.Inventory.Equipment[slot] == nil {
			// Slot is empty, auto-equip
			_, equipErr := player.EquipItem(item)
			if equipErr == nil {
				autoEquipped = true
				if config.Server.Debug.LogItemPickups {
					log.Printf("[WORLD] Player %s auto-equipped %s to slot %s", playerID, item.Name, slot)
				}
			}
		}
	}

	// If not auto-equipped, add to bag
	if !autoEquipped {
		if player.Inventory.IsFull() {
			return fmt.Errorf("inventory is full")
		}

		_, err := player.Inventory.AddToBag(item)
		if err != nil {
			return err
		}
	}

	// Remove from ground
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

	// Create ground item near player position, spread out from other items
	dropPos := w.findOpenDropPosition(player.Position)
	groundItemID := fmt.Sprintf("ground-%d", time.Now().UnixNano())
	groundItem := NewGroundItem(groundItemID, item, dropPos)
	w.groundItems[groundItemID] = groundItem

	if config.Server.Debug.LogItemDrops {
		log.Printf("[WORLD] Player %s dropped %s on ground", playerID, item.Name)
	}
	return nil
}
