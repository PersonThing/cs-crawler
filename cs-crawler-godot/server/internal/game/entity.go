package game

import (
	"encoding/json"
	"log"
	"time"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
)

// Vector3 represents a 3D position or velocity
type Vector3 struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// Player represents a player character
type Player struct {
	ID        string
	Username  string
	Position  Vector3
	Velocity  Vector3
	Rotation  float64 // Y-axis rotation in radians
	Health    float64
	MaxHealth float64

	// Base Stats (before item bonuses)
	BaseMaxHealth float64
	BaseMoveSpeed float64
	BaseDamage    float64
	BaseArmor     float64

	// Current Stats (after item bonuses)
	MoveSpeed       float64
	Damage          float64
	AttackSpeed     float64
	CritChance      float64
	CritDamage      float64
	FireDamage      float64
	ColdDamage      float64
	LightningDamage float64
	Armor           float64
	FireResist      float64
	ColdResist      float64
	LightningResist float64

	// Dungeon visibility
	LightRadius float64 // How far the player can see in dungeons

	// Inventory
	Inventory *Inventory

	// Abilities
	Abilities *AbilityManager

	// Character AI (autonomous combat)
	CharAI     *CharacterAI
	AutoCombat bool // When true, character AI handles combat

	// Tile tracking
	CurrentTile HexCoord

	// State
	LastUpdate time.Time
}

// NewPlayer creates a new player
func NewPlayer(id, username string) *Player {
	// Load player stats from config
	stats := config.Player.BaseStats

	player := &Player{
		ID:            id,
		Username:      username,
		Position:      Vector3{X: 0, Y: 0, Z: 0},
		Velocity:      Vector3{X: 0, Y: 0, Z: 0},
		Health:        stats.Health,
		MaxHealth:     stats.MaxHealth,
		BaseMaxHealth: stats.MaxHealth,
		BaseMoveSpeed: stats.MoveSpeed,
		BaseDamage:    10.0, // Default base damage
		BaseArmor:     0.0,
		Inventory:     NewInventory(),
		Abilities:     NewAbilityManager(),
		CharAI:        NewCharacterAI(),
		AutoCombat:    false,
		LastUpdate:    time.Now(),
	}

	// Calculate initial stats from base + equipment
	player.RecalculateStats()

	return player
}

// Update processes player logic
func (p *Player) Update(delta float64) {
	// Update position based on velocity and move speed
	p.Position.X += p.Velocity.X * p.MoveSpeed * delta
	p.Position.Y += p.Velocity.Y * p.MoveSpeed * delta
	p.Position.Z += p.Velocity.Z * p.MoveSpeed * delta

	p.LastUpdate = time.Now()
}

// IsDead returns true if the player has no health
func (p *Player) IsDead() bool {
	return p.Health <= 0
}

// SetVelocity updates player velocity (normalized by client)
func (p *Player) SetVelocity(v Vector3) {
	p.Velocity = v
}

// RecalculateStats recalculates all player stats from base stats + equipped items
func (p *Player) RecalculateStats() {
	// Start with base stats
	p.MaxHealth = p.BaseMaxHealth
	p.MoveSpeed = p.BaseMoveSpeed
	p.Damage = p.BaseDamage
	p.Armor = p.BaseArmor
	p.AttackSpeed = 100.0 // Base 100%
	p.CritChance = 5.0    // Base 5%
	p.CritDamage = 150.0  // Base 150%
	p.FireDamage = 0.0
	p.ColdDamage = 0.0
	p.LightningDamage = 0.0
	p.FireResist = 0.0
	p.ColdResist = 0.0
	p.LightningResist = 0.0
	p.LightRadius = 10.0 // Base light radius in world units

	// Get stats from inventory
	if p.Inventory != nil {
		itemStats := p.Inventory.GetAllStats()

		// Apply item bonuses
		for stat, value := range itemStats {
			switch stat {
			case StatHealth:
				p.MaxHealth += value
			case StatDamage:
				p.Damage += value
			case StatMoveSpeed:
				p.MoveSpeed += value
			case StatAttackSpeed:
				p.AttackSpeed += value
			case StatCritChance:
				p.CritChance += value
			case StatCritDamage:
				p.CritDamage += value
			case StatFireDamage:
				p.FireDamage += value
			case StatColdDamage:
				p.ColdDamage += value
			case StatLightningDamage:
				p.LightningDamage += value
			case StatArmor:
				p.Armor += value
			case StatFireResist:
				p.FireResist += value
			case StatColdResist:
				p.ColdResist += value
			case StatLightningResist:
				p.LightningResist += value
			}
		}
	}

	// Ensure health doesn't exceed max after stat changes
	if p.Health > p.MaxHealth {
		p.Health = p.MaxHealth
	}
}

// EquipItem equips an item and recalculates stats
func (p *Player) EquipItem(item *Item) ([]*Item, error) {
	return p.EquipItemToSlot(item, "")
}

// EquipItemToSlot equips an item to a specific slot and recalculates stats
// Returns a slice of unequipped items (may be 0, 1, or 2 items for 2H weapon replacing dual 1H)
func (p *Player) EquipItemToSlot(item *Item, targetSlot EquipmentSlot) ([]*Item, error) {
	if p.Inventory == nil {
		return nil, nil
	}

	unequipped, err := p.Inventory.EquipItemToSlot(item, targetSlot)
	if err != nil {
		return nil, err
	}

	p.RecalculateStats()
	return unequipped, nil
}

// UnequipSlot unequips an item from a slot and recalculates stats
func (p *Player) UnequipSlot(slot EquipmentSlot) (*Item, error) {
	if p.Inventory == nil {
		return nil, nil
	}

	item, err := p.Inventory.UnequipItem(slot)
	if err != nil {
		return nil, err
	}

	p.RecalculateStats()
	return item, nil
}

// Serialize converts player to JSON-friendly format
func (p *Player) Serialize() map[string]interface{} {
	result := map[string]interface{}{
		"id":        p.ID,
		"username":  p.Username,
		"position":  p.Position,
		"velocity":  p.Velocity,
		"rotation":  p.Rotation,
		"health":    p.Health,
		"maxHealth": p.MaxHealth,
		"stats": map[string]interface{}{
			"moveSpeed":       p.MoveSpeed,
			"damage":          p.Damage,
			"attackSpeed":     p.AttackSpeed,
			"critChance":      p.CritChance,
			"critDamage":      p.CritDamage,
			"fireDamage":      p.FireDamage,
			"coldDamage":      p.ColdDamage,
			"lightningDamage": p.LightningDamage,
			"armor":           p.Armor,
			"fireResist":      p.FireResist,
			"coldResist":      p.ColdResist,
			"lightningResist": p.LightningResist,
			"lightRadius":     p.LightRadius,
		},
	}

	if p.Inventory != nil {
		result["inventory"] = p.Inventory.Serialize()
	}

	if p.CharAI != nil {
		result["characterAI"] = p.CharAI.Serialize()
		result["autoCombat"] = p.AutoCombat
	}

	return result
}

// ToSaveData serializes the player state for database persistence
func (p *Player) ToSaveData() (equippedJSON, bagsJSON json.RawMessage, err error) {
	if p.Inventory == nil {
		equippedJSON = json.RawMessage("{}")
		bagsJSON = json.RawMessage("[]")
		return
	}

	invData := p.Inventory.Serialize()

	equippedJSON, err = json.Marshal(invData["equipment"])
	if err != nil {
		return nil, nil, err
	}

	bagsJSON, err = json.Marshal(invData["bags"])
	if err != nil {
		return nil, nil, err
	}

	return
}

// RestoreFromSave restores player state from database data
func (p *Player) RestoreFromSave(posX, posY, posZ, rotation, health float64, equippedJSON, bagsJSON json.RawMessage) {
	p.Position = Vector3{X: posX, Y: posY, Z: posZ}
	p.Rotation = rotation
	// Reset health to max if player was dead (respawn on reconnect)
	if health <= 0 {
		p.Health = p.MaxHealth
	} else {
		p.Health = health
	}

	// Deserialize inventory
	var equippedData map[string]interface{}
	var bagsData []interface{}

	if err := json.Unmarshal(equippedJSON, &equippedData); err != nil {
		log.Printf("[LOAD] Failed to unmarshal equipped items: %v", err)
		return
	}
	if err := json.Unmarshal(bagsJSON, &bagsData); err != nil {
		log.Printf("[LOAD] Failed to unmarshal bag items: %v", err)
		return
	}

	p.Inventory = DeserializeInventory(equippedData, bagsData)
	p.RecalculateStats()

	// Clamp health to max after recalculating stats
	if p.Health > p.MaxHealth {
		p.Health = p.MaxHealth
	}
}

// Enemy represents an enemy entity
type Enemy struct {
	ID        string
	Type      string
	Position  Vector3
	Velocity  Vector3
	Health    float64
	MaxHealth float64
	Dead      bool

	// AI
	AI *EnemyAI

	// Combat stats (from config)
	Damage      float64
	AttackRange float64

	// Status effects
	StatusEffects map[StatusEffectType]*StatusEffect

	// Buffs from allies (shaman, etc.)
	DamageBuff     float64 // Multiplier (1.0 = no buff)
	SpeedBuff      float64 // Multiplier (1.0 = no buff)
	BuffExpireTime time.Time

	LastUpdate time.Time
}

// NewEnemy creates a new enemy
func NewEnemy(id, enemyType string, position Vector3) *Enemy {
	// Load enemy config
	cfg, ok := config.GetEnemyConfig(enemyType)
	if !ok {
		log.Printf("[ENEMY] Config not found for type '%s', using defaults", enemyType)
		cfg = &config.EnemyConfig{
			Health:    100,
			MaxHealth: 100,
			Damage:    10,
			AI: config.EnemyAI{
				Type:       "idle",
				AggroRange: 0,
			},
		}
	}

	return &Enemy{
		ID:            id,
		Type:          enemyType,
		Position:      position,
		Velocity:      Vector3{X: 0, Y: 0, Z: 0},
		Health:        cfg.Health,
		MaxHealth:     cfg.MaxHealth,
		Dead:          false,
		AI:            NewEnemyAI(cfg),
		Damage:        cfg.Damage,
		AttackRange:   2.0, // Default melee range, will be overridden by AI
		StatusEffects: make(map[StatusEffectType]*StatusEffect),
		DamageBuff:    1.0,
		SpeedBuff:     1.0,
		LastUpdate:    time.Now(),
	}
}

// Update processes enemy AI and movement
func (e *Enemy) Update(delta float64) {
	// Update status effects - remove expired ones
	for effectType, effect := range e.StatusEffects {
		if effect.IsExpired() {
			delete(e.StatusEffects, effectType)
		}
	}

	// Update buffs
	if time.Now().After(e.BuffExpireTime) {
		e.DamageBuff = 1.0
		e.SpeedBuff = 1.0
	}

	e.LastUpdate = time.Now()
}

// UpdateAI processes enemy AI with context (called from World.Update)
func (e *Enemy) UpdateAI(ctx *EnemyAIContext) *EnemyAttackResult {
	if e.Dead || e.AI == nil {
		return nil
	}

	// Update status effects first
	for effectType, effect := range e.StatusEffects {
		if effect.IsExpired() {
			delete(e.StatusEffects, effectType)
		}
	}

	// Update buffs
	if time.Now().After(e.BuffExpireTime) {
		e.DamageBuff = 1.0
		e.SpeedBuff = 1.0
	}

	e.LastUpdate = time.Now()

	// Run AI
	return e.AI.Update(e, ctx)
}

// ApplyBuff applies a buff to the enemy
func (e *Enemy) ApplyBuff(damageMult, speedMult, duration float64) {
	e.DamageBuff = damageMult
	e.SpeedBuff = speedMult
	e.BuffExpireTime = time.Now().Add(time.Duration(duration * float64(time.Second)))
}

// TakeDamage applies damage to the enemy and returns true if it died
func (e *Enemy) TakeDamage(damage DamageInfo) bool {
	if e.Dead {
		return false
	}

	e.Health -= damage.Amount
	if e.Health <= 0 {
		e.Health = 0
		e.Dead = true
		return true
	}
	return false
}

// GetHealth returns current health
func (e *Enemy) GetHealth() float64 {
	return e.Health
}

// GetMaxHealth returns maximum health
func (e *Enemy) GetMaxHealth() float64 {
	return e.MaxHealth
}

// IsDead returns whether the enemy is dead
func (e *Enemy) IsDead() bool {
	return e.Dead
}

// ApplyStatusEffect applies a status effect to the enemy
func (e *Enemy) ApplyStatusEffect(effect *StatusEffect) {
	// Replace existing effect of the same type
	e.StatusEffects[effect.Type] = effect
}

// HasStatusEffect checks if the enemy has a specific status effect
func (e *Enemy) HasStatusEffect(effectType StatusEffectType) bool {
	effect, exists := e.StatusEffects[effectType]
	if !exists {
		return false
	}
	return !effect.IsExpired()
}

// GetStatusEffect returns a specific status effect if it exists and is not expired
func (e *Enemy) GetStatusEffect(effectType StatusEffectType) *StatusEffect {
	if e.HasStatusEffect(effectType) {
		return e.StatusEffects[effectType]
	}
	return nil
}

// Serialize converts enemy to JSON-friendly format
func (e *Enemy) Serialize() map[string]interface{} {
	// Serialize active status effects
	activeEffects := make([]map[string]interface{}, 0)
	for _, effect := range e.StatusEffects {
		if !effect.IsExpired() {
			activeEffects = append(activeEffects, effect.Serialize())
		}
	}

	result := map[string]interface{}{
		"id":            e.ID,
		"type":          e.Type,
		"position":      e.Position,
		"velocity":      e.Velocity,
		"health":        e.Health,
		"maxHealth":     e.MaxHealth,
		"dead":          e.Dead,
		"statusEffects": activeEffects,
	}

	// Add AI state if available
	if e.AI != nil {
		result["aiState"] = string(e.AI.State)
		result["targetID"] = e.AI.TargetID
		result["isRaging"] = e.AI.RageMode
		result["isCharging"] = e.AI.IsCharging
	}

	// Add buff info if active
	if e.DamageBuff != 1.0 || e.SpeedBuff != 1.0 {
		result["isBuffed"] = true
	}

	return result
}

// Projectile represents a projectile entity
type Projectile struct {
	ID               string
	OwnerID          string
	Position         Vector3
	Velocity         Vector3
	Damage           float64
	DamageType       DamageType
	Speed            float64
	Radius           float64
	CreatedAt        time.Time
	Lifetime         float64
	AbilityType      string
	StatusEffectInfo *StatusEffectInfo // Status effect to apply on hit

	// Modifier support
	IsHoming       bool     // If true, projectile tracks nearest enemy
	HomingTurnRate float64  // Degrees per second
	IsPiercing     bool     // If true, projectile passes through enemies
	MaxPierces     int      // Maximum number of pierces (-1 for infinite)
	PierceCount    int      // Current number of enemies pierced
	HitEnemies     []string // Track which enemies have been hit (for piercing)

	// Enemy projectile support
	IsEnemyProjectile bool     // If true, this projectile damages players instead of enemies
	HitPlayers        []string // Track which players have been hit (for piercing enemy projectiles)
}

// NewProjectile creates a new projectile
func NewProjectile(id, ownerID string, position, velocity Vector3, damage float64, damageType DamageType, abilityType string) *Projectile {
	return &Projectile{
		ID:               id,
		OwnerID:          ownerID,
		Position:         position,
		Velocity:         velocity,
		Damage:           damage,
		DamageType:       damageType,
		Speed:            15.0,
		Radius:           0.5,
		CreatedAt:        time.Now(),
		Lifetime:         5.0,
		AbilityType:      abilityType,
		StatusEffectInfo: nil,
		IsHoming:         false,
		HomingTurnRate:   0,
		IsPiercing:       false,
		MaxPierces:       0,
		PierceCount:      0,
		HitEnemies:       make([]string, 0),
	}
}

// NewEnemyProjectile creates a projectile fired by an enemy towards players
func NewEnemyProjectile(id, ownerID string, position, direction Vector3, damage float64, damageType DamageType) *Projectile {
	speed := 10.0 // Enemy projectiles are slightly slower
	return &Projectile{
		ID:                id,
		OwnerID:           ownerID,
		Position:          Vector3{X: position.X, Y: 0.5, Z: position.Z}, // Spawn at consistent height
		Velocity:          Vector3{X: direction.X * speed, Y: 0, Z: direction.Z * speed},
		Damage:            damage,
		DamageType:        damageType,
		Speed:             speed,
		Radius:            0.4,
		CreatedAt:         time.Now(),
		Lifetime:          4.0,
		AbilityType:       "enemy_projectile",
		StatusEffectInfo:  nil,
		IsHoming:          false,
		HomingTurnRate:    0,
		IsPiercing:        false,
		MaxPierces:        0,
		PierceCount:       0,
		HitEnemies:        make([]string, 0),
		IsEnemyProjectile: true,
	}
}

// Update processes projectile movement
func (p *Projectile) Update(delta float64) {
	p.Position.X += p.Velocity.X * delta
	p.Position.Y += p.Velocity.Y * delta
	p.Position.Z += p.Velocity.Z * delta
}

// UpdateHoming updates projectile velocity to track an enemy
func (p *Projectile) UpdateHoming(target Vector3, delta float64) {
	if !p.IsHoming {
		return
	}

	// Calculate direction to target
	toTarget := Vector3{
		X: target.X - p.Position.X,
		Y: 0,
		Z: target.Z - p.Position.Z,
	}

	// Normalize current velocity direction
	currentDir := Normalize2D(p.Velocity)

	// Normalize target direction
	targetDir := Normalize2D(toTarget)

	// Calculate how much we can turn this frame (in radians)
	maxTurnRadians := (p.HomingTurnRate * delta) * (3.14159 / 180.0)

	// Use lerp/slerp to smoothly rotate towards target
	// Simple linear interpolation for now
	t := maxTurnRadians / 3.14159 // Normalize turn amount
	if t > 1.0 {
		t = 1.0
	}

	newDirX := currentDir.X + (targetDir.X-currentDir.X)*t
	newDirZ := currentDir.Z + (targetDir.Z-currentDir.Z)*t

	// Renormalize and apply speed
	newDir := Normalize2D(Vector3{X: newDirX, Y: 0, Z: newDirZ})
	p.Velocity.X = newDir.X * p.Speed
	p.Velocity.Z = newDir.Z * p.Speed
}

// HasHitEnemy checks if this projectile has already hit a specific enemy (for piercing)
func (p *Projectile) HasHitEnemy(enemyID string) bool {
	for _, id := range p.HitEnemies {
		if id == enemyID {
			return true
		}
	}
	return false
}

// MarkEnemyHit marks an enemy as hit by this projectile
func (p *Projectile) MarkEnemyHit(enemyID string) {
	p.HitEnemies = append(p.HitEnemies, enemyID)
	p.PierceCount++
}

// CanPierce checks if projectile can still pierce through enemies
func (p *Projectile) CanPierce() bool {
	if !p.IsPiercing {
		return false
	}
	if p.MaxPierces < 0 {
		return true // Infinite piercing
	}
	return p.PierceCount < p.MaxPierces
}

// ShouldDestroy returns true if projectile should be removed
func (p *Projectile) ShouldDestroy() bool {
	return time.Since(p.CreatedAt).Seconds() > p.Lifetime
}

// Serialize converts projectile to JSON-friendly format
func (p *Projectile) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":                p.ID,
		"ownerID":           p.OwnerID,
		"position":          p.Position,
		"velocity":          p.Velocity,
		"abilityType":       p.AbilityType,
		"isEnemyProjectile": p.IsEnemyProjectile,
	}
}
