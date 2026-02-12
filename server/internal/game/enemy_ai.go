package game

import (
	"math"
	"time"

	"github.com/PersonThing/cs-crawler/server/internal/config"
)

// EnemyAIState represents the current AI state of an enemy
type EnemyAIState string

const (
	AIStateIdle    EnemyAIState = "idle"
	AIStateChase   EnemyAIState = "chase"
	AIStateAttack  EnemyAIState = "attack"
	AIStateFlee    EnemyAIState = "flee"
	AIStateSupport EnemyAIState = "support" // For support enemies (shaman, necromancer)
)

// EnemyBehaviorType represents how the enemy behaves
type EnemyBehaviorType string

const (
	BehaviorIdle     EnemyBehaviorType = "idle"     // Doesn't move or attack
	BehaviorMelee    EnemyBehaviorType = "melee"    // Chases and attacks in melee range
	BehaviorRanged   EnemyBehaviorType = "ranged"   // Keeps distance, shoots projectiles
	BehaviorCharger  EnemyBehaviorType = "charger"  // Charges at player, deals damage on contact
	BehaviorExploder EnemyBehaviorType = "exploder" // Runs at player and explodes on death/contact
	BehaviorSupport  EnemyBehaviorType = "support"  // Buffs allies, stays away from players
	BehaviorSummoner EnemyBehaviorType = "summoner" // Summons minions, stays back
)

// EnemyAI contains AI-related state and configuration
type EnemyAI struct {
	State          EnemyAIState
	Behavior       EnemyBehaviorType
	TargetID       string    // Current target player ID
	TargetPosition Vector3   // Last known target position
	AggroRange     float64   // Range at which enemy notices player
	AttackRange    float64   // Range at which enemy can attack
	AttackCooldown float64   // Time between attacks in seconds
	LastAttackTime time.Time // When enemy last attacked
	MoveSpeed      float64   // Movement speed
	ChaseSpeed     float64   // Speed when chasing (can be different from move speed)
	FleeHealth     float64   // Health percentage at which enemy flees (0-1)

	// Behavior-specific fields
	ChargeSpeed    float64 // Speed during charge (for chargers)
	IsCharging     bool    // Whether currently charging
	ChargeStartPos Vector3 // Position where charge started
	ChargeDuration float64 // How long to charge
	ChargeTimer    float64 // Current charge timer

	ExplosionRadius float64 // Explosion radius (for exploders)
	ExplosionDamage float64 // Explosion damage (for exploders)

	// Support/Summoner fields
	SupportRange   float64   // Range at which support abilities work
	SummonCooldown float64   // Cooldown for summoning
	LastSummonTime time.Time // When last summoned
	MaxSummons     int       // Maximum number of summons allowed
	CurrentSummons int       // Current summon count

	// Pack behavior
	PackID         string // ID of the pack this enemy belongs to
	IsPackLeader   bool   // Whether this enemy is the pack leader
	PackBuffActive bool   // Whether pack buff is currently active

	// Rage mode
	RageMode       bool    // Whether enemy is enraged
	RageThreshold  float64 // Health percentage that triggers rage (0-1)
	RageDamageMult float64 // Damage multiplier when enraged
	RageSpeedMult  float64 // Speed multiplier when enraged
}

// EnemyAIContext provides context for AI decisions
type EnemyAIContext struct {
	Players      map[string]*Player
	Enemies      map[string]*Enemy
	DeltaSeconds float64
	World        *World // Reference to world for spawning projectiles etc.
}

// NewEnemyAI creates a new enemy AI from config
func NewEnemyAI(cfg *config.EnemyConfig) *EnemyAI {
	ai := &EnemyAI{
		State:          AIStateIdle,
		Behavior:       BehaviorMelee, // Default behavior
		AggroRange:     cfg.AI.AggroRange,
		MoveSpeed:      cfg.MoveSpeed,
		ChaseSpeed:     cfg.AI.ChaseSpeed,
		AttackRange:    2.0, // Default melee range
		AttackCooldown: 1.0, // Default 1 second between attacks
		LastAttackTime: time.Now(),
		FleeHealth:     cfg.AI.FleeHealth,
		RageThreshold:  cfg.AI.RageThreshold,
		RageDamageMult: 1.5,
		RageSpeedMult:  1.3,
	}

	// Apply config overrides
	if cfg.AI.AttackRange > 0 {
		ai.AttackRange = cfg.AI.AttackRange
	}
	if cfg.AI.AttackCooldown > 0 {
		ai.AttackCooldown = cfg.AI.AttackCooldown
	}

	// Set behavior based on AI type
	switch cfg.AI.Type {
	case "idle":
		ai.Behavior = BehaviorIdle
	case "chase", "melee":
		ai.Behavior = BehaviorMelee
	case "ranged":
		ai.Behavior = BehaviorRanged
		if ai.AttackRange == 2.0 { // Still default
			ai.AttackRange = 12.0 // Default ranged attack range
		}
	case "charger":
		ai.Behavior = BehaviorCharger
		ai.ChargeDuration = 1.5
		if cfg.AI.ChargeSpeed > 0 {
			ai.ChargeSpeed = cfg.AI.ChargeSpeed
		} else {
			ai.ChargeSpeed = cfg.MoveSpeed * 3.0
		}
		if ai.AttackRange == 2.0 { // Still default
			ai.AttackRange = 10.0 // Start charging from this distance
		}
	case "exploder":
		ai.Behavior = BehaviorExploder
		if cfg.AI.ExplosionRadius > 0 {
			ai.ExplosionRadius = cfg.AI.ExplosionRadius
		} else {
			ai.ExplosionRadius = 3.0
		}
		if cfg.AI.ExplosionDamage > 0 {
			ai.ExplosionDamage = cfg.AI.ExplosionDamage
		} else {
			ai.ExplosionDamage = 50.0
		}
		if ai.AttackRange == 2.0 { // Still default
			ai.AttackRange = 1.0 // Explode on contact
		}
	case "support":
		ai.Behavior = BehaviorSupport
		if cfg.AI.SupportRange > 0 {
			ai.SupportRange = cfg.AI.SupportRange
		} else {
			ai.SupportRange = 10.0
		}
		if ai.AttackRange == 2.0 { // Still default
			ai.AttackRange = 15.0 // Keep distance from players
		}
	case "summoner":
		ai.Behavior = BehaviorSummoner
		if cfg.AI.SummonCooldown > 0 {
			ai.SummonCooldown = cfg.AI.SummonCooldown
		} else {
			ai.SummonCooldown = 5.0
		}
		if cfg.AI.MaxSummons > 0 {
			ai.MaxSummons = cfg.AI.MaxSummons
		} else {
			ai.MaxSummons = 3
		}
		if ai.AttackRange == 2.0 { // Still default
			ai.AttackRange = 20.0 // Keep far from players
		}
	}

	// Apply chase speed if specified
	if cfg.AI.ChaseSpeed > 0 {
		ai.ChaseSpeed = cfg.AI.ChaseSpeed
	} else if ai.ChaseSpeed == 0 {
		ai.ChaseSpeed = ai.MoveSpeed
	}

	return ai
}

// Update processes AI logic for this enemy
func (ai *EnemyAI) Update(enemy *Enemy, ctx *EnemyAIContext) *EnemyAttackResult {
	if enemy.Dead {
		return nil
	}

	// Update rage mode
	ai.checkRageMode(enemy)

	// Find target if we don't have one or current target is invalid
	if ai.TargetID == "" || !ai.isTargetValid(ctx) {
		ai.findTarget(enemy, ctx)
	}

	// Update state based on current situation
	ai.updateState(enemy, ctx)

	// Execute behavior based on current state
	return ai.executeBehavior(enemy, ctx)
}

// checkRageMode checks if enemy should enter or exit rage mode
func (ai *EnemyAI) checkRageMode(enemy *Enemy) {
	if ai.RageThreshold <= 0 {
		return
	}

	healthPercent := enemy.Health / enemy.MaxHealth
	if healthPercent <= ai.RageThreshold && !ai.RageMode {
		ai.RageMode = true
	}
}

// isTargetValid checks if the current target is still valid
func (ai *EnemyAI) isTargetValid(ctx *EnemyAIContext) bool {
	if ai.TargetID == "" {
		return false
	}
	player, exists := ctx.Players[ai.TargetID]
	if !exists {
		return false
	}
	// Check if player is alive (health > 0)
	return player.Health > 0
}

// findTarget finds the best target for this enemy
func (ai *EnemyAI) findTarget(enemy *Enemy, ctx *EnemyAIContext) {
	if len(ctx.Players) == 0 {
		ai.TargetID = ""
		return
	}

	// Find closest player within aggro range
	var closestPlayer *Player
	minDistance := ai.AggroRange

	for _, player := range ctx.Players {
		if player.Health <= 0 {
			continue
		}

		distance := Distance2D(enemy.Position, player.Position)
		if distance < minDistance {
			minDistance = distance
			closestPlayer = player
		}
	}

	if closestPlayer != nil {
		ai.TargetID = closestPlayer.ID
		ai.TargetPosition = closestPlayer.Position
		if ai.State == AIStateIdle {
			ai.State = AIStateChase
		}
	} else {
		ai.TargetID = ""
	}
}

// updateState updates the AI state based on current situation
func (ai *EnemyAI) updateState(enemy *Enemy, ctx *EnemyAIContext) {
	// Idle behavior never changes state
	if ai.Behavior == BehaviorIdle {
		ai.State = AIStateIdle
		return
	}

	// No target, go idle
	if ai.TargetID == "" {
		ai.State = AIStateIdle
		return
	}

	player, exists := ctx.Players[ai.TargetID]
	if !exists {
		ai.State = AIStateIdle
		return
	}

	distance := Distance2D(enemy.Position, player.Position)
	ai.TargetPosition = player.Position

	// Check flee condition
	if ai.FleeHealth > 0 && enemy.Health/enemy.MaxHealth <= ai.FleeHealth {
		ai.State = AIStateFlee
		return
	}

	// Check attack range
	attackRange := ai.AttackRange
	if ai.Behavior == BehaviorCharger && ai.IsCharging {
		// During charge, continue until contact
		if distance <= 1.0 {
			ai.State = AIStateAttack
		}
		return
	}

	if distance <= attackRange {
		// For support/summoner, don't enter attack state based on distance
		if ai.Behavior == BehaviorSupport || ai.Behavior == BehaviorSummoner {
			ai.State = AIStateSupport
		} else {
			ai.State = AIStateAttack
		}
	} else if distance <= ai.AggroRange {
		ai.State = AIStateChase
	} else {
		ai.State = AIStateIdle
	}
}

// EnemyAttackResult contains the result of an enemy attack
type EnemyAttackResult struct {
	TargetID        string
	Damage          float64
	DamageType      DamageType
	Position        Vector3             // Position of attack (for projectiles, explosions)
	Direction       Vector3             // Direction of attack
	IsProjectile    bool                // If true, spawn a projectile
	IsExplosion     bool                // If true, deal AoE damage
	ExplosionRadius float64             // Radius of explosion
	SpawnEnemies    []SpawnEnemyRequest // Enemies to spawn (for summoners)
	ApplyBuff       *EnemyBuff          // Buff to apply to nearby allies
}

// SpawnEnemyRequest describes an enemy to spawn
type SpawnEnemyRequest struct {
	Type     string
	Position Vector3
}

// EnemyBuff describes a buff to apply
type EnemyBuff struct {
	DamageMult float64
	SpeedMult  float64
	Duration   float64
	Radius     float64
}

// executeBehavior executes the current behavior and returns attack result if any
func (ai *EnemyAI) executeBehavior(enemy *Enemy, ctx *EnemyAIContext) *EnemyAttackResult {
	switch ai.State {
	case AIStateIdle:
		// Stop moving
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil

	case AIStateChase:
		return ai.executeChase(enemy, ctx)

	case AIStateAttack:
		return ai.executeAttack(enemy, ctx)

	case AIStateFlee:
		return ai.executeFlee(enemy, ctx)

	case AIStateSupport:
		return ai.executeSupport(enemy, ctx)
	}

	return nil
}

// executeChase moves the enemy towards the target
func (ai *EnemyAI) executeChase(enemy *Enemy, ctx *EnemyAIContext) *EnemyAttackResult {
	if ai.TargetID == "" {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	player, exists := ctx.Players[ai.TargetID]
	if !exists {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	// Calculate direction to player
	dx := player.Position.X - enemy.Position.X
	dz := player.Position.Z - enemy.Position.Z
	distance := math.Sqrt(dx*dx + dz*dz)

	if distance <= 0.1 {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	// Normalize and apply speed
	speed := ai.ChaseSpeed
	if ai.RageMode {
		speed *= ai.RageSpeedMult
	}

	// Apply slow status effect
	if enemy.HasStatusEffect(StatusEffectSlow) {
		slowEffect := enemy.GetStatusEffect(StatusEffectSlow)
		if slowEffect != nil {
			speed *= (1.0 - slowEffect.Magnitude)
		}
	}

	// Check for stun
	if enemy.HasStatusEffect(StatusEffectStun) {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	enemy.Velocity = Vector3{
		X: (dx / distance) * speed,
		Y: 0,
		Z: (dz / distance) * speed,
	}

	// Apply velocity to position
	enemy.Position.X += enemy.Velocity.X * ctx.DeltaSeconds
	enemy.Position.Z += enemy.Velocity.Z * ctx.DeltaSeconds

	// For chargers, check if we should start charging
	if ai.Behavior == BehaviorCharger && !ai.IsCharging {
		if distance <= ai.AttackRange && distance > 2.0 {
			ai.IsCharging = true
			ai.ChargeStartPos = enemy.Position
			ai.ChargeTimer = 0

			// Apply charge speed
			enemy.Velocity = Vector3{
				X: (dx / distance) * ai.ChargeSpeed,
				Y: 0,
				Z: (dz / distance) * ai.ChargeSpeed,
			}
		}
	}

	// Update charge
	if ai.IsCharging {
		ai.ChargeTimer += ctx.DeltaSeconds
		if ai.ChargeTimer >= ai.ChargeDuration {
			ai.IsCharging = false
		}
	}

	return nil
}

// executeAttack performs the enemy's attack
func (ai *EnemyAI) executeAttack(enemy *Enemy, ctx *EnemyAIContext) *EnemyAttackResult {
	// Check for stun
	if enemy.HasStatusEffect(StatusEffectStun) {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	// Check attack cooldown
	if time.Since(ai.LastAttackTime).Seconds() < ai.AttackCooldown {
		// Still on cooldown, but keep chasing if melee
		if ai.Behavior == BehaviorMelee || ai.Behavior == BehaviorCharger {
			return ai.executeChase(enemy, ctx)
		}
		return nil
	}

	player, exists := ctx.Players[ai.TargetID]
	if !exists {
		return nil
	}

	// Calculate direction to player
	dx := player.Position.X - enemy.Position.X
	dz := player.Position.Z - enemy.Position.Z
	distance := math.Sqrt(dx*dx + dz*dz)

	if distance <= 0.1 {
		distance = 0.1
	}

	direction := Vector3{
		X: dx / distance,
		Y: 0,
		Z: dz / distance,
	}

	// Stop moving while attacking for ranged
	if ai.Behavior != BehaviorMelee {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
	}

	// Get base damage from config
	cfg, ok := config.GetEnemyConfig(enemy.Type)
	baseDamage := 10.0
	if ok {
		baseDamage = cfg.Damage
	}

	// Apply rage multiplier
	if ai.RageMode {
		baseDamage *= ai.RageDamageMult
	}

	ai.LastAttackTime = time.Now()

	switch ai.Behavior {
	case BehaviorMelee, BehaviorCharger:
		// Melee attack - direct damage
		if ai.IsCharging {
			ai.IsCharging = false
			baseDamage *= 1.5 // Charge bonus damage
		}
		return &EnemyAttackResult{
			TargetID:   ai.TargetID,
			Damage:     baseDamage,
			DamageType: DamageTypePhysical,
			Position:   enemy.Position,
			Direction:  direction,
		}

	case BehaviorRanged:
		// Ranged attack - spawn projectile
		return &EnemyAttackResult{
			TargetID:     ai.TargetID,
			Damage:       baseDamage,
			DamageType:   DamageTypeFire, // Default to fire for ranged
			Position:     enemy.Position,
			Direction:    direction,
			IsProjectile: true,
		}

	case BehaviorExploder:
		// Explode on contact
		return &EnemyAttackResult{
			Damage:          ai.ExplosionDamage,
			DamageType:      DamageTypeFire,
			Position:        enemy.Position,
			IsExplosion:     true,
			ExplosionRadius: ai.ExplosionRadius,
		}
	}

	return nil
}

// executeFlee moves the enemy away from the target
func (ai *EnemyAI) executeFlee(enemy *Enemy, ctx *EnemyAIContext) *EnemyAttackResult {
	if ai.TargetID == "" {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	player, exists := ctx.Players[ai.TargetID]
	if !exists {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	// Calculate direction away from player
	dx := enemy.Position.X - player.Position.X
	dz := enemy.Position.Z - player.Position.Z
	distance := math.Sqrt(dx*dx + dz*dz)

	if distance <= 0.1 {
		distance = 0.1
	}

	// Apply speed (flee at chase speed)
	speed := ai.ChaseSpeed
	if ai.RageMode {
		speed *= ai.RageSpeedMult
	}

	enemy.Velocity = Vector3{
		X: (dx / distance) * speed,
		Y: 0,
		Z: (dz / distance) * speed,
	}

	// Apply velocity to position
	enemy.Position.X += enemy.Velocity.X * ctx.DeltaSeconds
	enemy.Position.Z += enemy.Velocity.Z * ctx.DeltaSeconds

	return nil
}

// executeSupport performs support behavior (buffing allies, summoning)
func (ai *EnemyAI) executeSupport(enemy *Enemy, ctx *EnemyAIContext) *EnemyAttackResult {
	// Check for stun
	if enemy.HasStatusEffect(StatusEffectStun) {
		enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
		return nil
	}

	// Keep distance from players
	if ai.TargetID != "" {
		player, exists := ctx.Players[ai.TargetID]
		if exists {
			distance := Distance2D(enemy.Position, player.Position)

			// If too close, back away
			if distance < ai.AttackRange*0.7 {
				dx := enemy.Position.X - player.Position.X
				dz := enemy.Position.Z - player.Position.Z
				dist := math.Sqrt(dx*dx + dz*dz)
				if dist > 0.1 {
					speed := ai.MoveSpeed
					enemy.Velocity = Vector3{
						X: (dx / dist) * speed,
						Y: 0,
						Z: (dz / dist) * speed,
					}
					enemy.Position.X += enemy.Velocity.X * ctx.DeltaSeconds
					enemy.Position.Z += enemy.Velocity.Z * ctx.DeltaSeconds
				}
			} else {
				enemy.Velocity = Vector3{X: 0, Y: 0, Z: 0}
			}
		}
	}

	// Check attack/support cooldown
	if time.Since(ai.LastAttackTime).Seconds() < ai.AttackCooldown {
		return nil
	}

	switch ai.Behavior {
	case BehaviorSupport:
		// Buff nearby allies
		ai.LastAttackTime = time.Now()
		return &EnemyAttackResult{
			Position: enemy.Position,
			ApplyBuff: &EnemyBuff{
				DamageMult: 1.25,
				SpeedMult:  1.15,
				Duration:   5.0,
				Radius:     ai.SupportRange,
			},
		}

	case BehaviorSummoner:
		// Check summon cooldown and count
		if time.Since(ai.LastSummonTime).Seconds() < ai.SummonCooldown {
			return nil
		}
		if ai.CurrentSummons >= ai.MaxSummons {
			return nil
		}

		ai.LastSummonTime = time.Now()
		ai.CurrentSummons++

		// Spawn minion near the summoner
		angle := float64(time.Now().UnixNano()%628) / 100.0 // Random angle
		spawnPos := Vector3{
			X: enemy.Position.X + math.Cos(angle)*2.0,
			Y: 0,
			Z: enemy.Position.Z + math.Sin(angle)*2.0,
		}

		return &EnemyAttackResult{
			Position: enemy.Position,
			SpawnEnemies: []SpawnEnemyRequest{
				{Type: "skeleton", Position: spawnPos},
			},
		}
	}

	return nil
}

// GetDirectionTo returns a normalized direction vector to a target position
func (ai *EnemyAI) GetDirectionTo(from, to Vector3) Vector3 {
	direction := Vector3{
		X: to.X - from.X,
		Y: 0,
		Z: to.Z - from.Z,
	}
	return Normalize2D(direction)
}

// FindNearestPlayer finds the nearest player to a position
func FindNearestPlayer(pos Vector3, players map[string]*Player, maxRange float64) *Player {
	var nearest *Player
	minDistance := maxRange

	for _, player := range players {
		if player.Health <= 0 {
			continue
		}

		distance := Distance2D(pos, player.Position)
		if distance < minDistance {
			minDistance = distance
			nearest = player
		}
	}

	return nearest
}
