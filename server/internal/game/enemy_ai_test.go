package game

import (
	"testing"
	"time"

	"github.com/PersonThing/cs-crawler/server/internal/config"
	"github.com/stretchr/testify/assert"
)

// Test helper to create a basic enemy config
func createTestEnemyConfig(aiType string, aggroRange float64) *config.EnemyConfig {
	return &config.EnemyConfig{
		Name:      "Test Enemy",
		Health:    100,
		MaxHealth: 100,
		MoveSpeed: 5.0,
		Damage:    10,
		AI: config.EnemyAI{
			Type:       aiType,
			AggroRange: aggroRange,
			ChaseSpeed: 5.0,
		},
	}
}

// Test helper to create an enemy with AI
func createTestEnemy(id, enemyType string, pos Vector3, cfg *config.EnemyConfig) *Enemy {
	enemy := &Enemy{
		ID:            id,
		Type:          enemyType,
		Position:      pos,
		Velocity:      Vector3{X: 0, Y: 0, Z: 0},
		Health:        cfg.Health,
		MaxHealth:     cfg.MaxHealth,
		Dead:          false,
		AI:            NewEnemyAI(cfg),
		Damage:        cfg.Damage,
		StatusEffects: make(map[StatusEffectType]*StatusEffect),
		DamageBuff:    1.0,
		SpeedBuff:     1.0,
		LastUpdate:    time.Now(),
	}
	return enemy
}

func TestNewEnemyAI_IdleBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("idle", 0)
	ai := NewEnemyAI(cfg)

	assert.Equal(t, AIStateIdle, ai.State)
	assert.Equal(t, BehaviorIdle, ai.Behavior)
	assert.Equal(t, 0.0, ai.AggroRange)
}

func TestNewEnemyAI_MeleeBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	ai := NewEnemyAI(cfg)

	assert.Equal(t, AIStateIdle, ai.State)
	assert.Equal(t, BehaviorMelee, ai.Behavior)
	assert.Equal(t, 15.0, ai.AggroRange)
	assert.Equal(t, 5.0, ai.ChaseSpeed)
}

func TestNewEnemyAI_RangedBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("ranged", 20.0)
	ai := NewEnemyAI(cfg)

	assert.Equal(t, BehaviorRanged, ai.Behavior)
	assert.Equal(t, 12.0, ai.AttackRange) // Default ranged attack range
}

func TestNewEnemyAI_ChargerBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("charger", 18.0)
	cfg.AI.ChargeSpeed = 15.0
	ai := NewEnemyAI(cfg)

	assert.Equal(t, BehaviorCharger, ai.Behavior)
	assert.Equal(t, 15.0, ai.ChargeSpeed)
	assert.Equal(t, 10.0, ai.AttackRange) // Start charging distance
}

func TestNewEnemyAI_ExploderBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("exploder", 15.0)
	cfg.AI.ExplosionRadius = 4.0
	cfg.AI.ExplosionDamage = 50.0
	ai := NewEnemyAI(cfg)

	assert.Equal(t, BehaviorExploder, ai.Behavior)
	assert.Equal(t, 4.0, ai.ExplosionRadius)
	assert.Equal(t, 50.0, ai.ExplosionDamage)
}

func TestNewEnemyAI_SupportBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("support", 20.0)
	cfg.AI.SupportRange = 10.0
	ai := NewEnemyAI(cfg)

	assert.Equal(t, BehaviorSupport, ai.Behavior)
	assert.Equal(t, 10.0, ai.SupportRange)
}

func TestNewEnemyAI_SummonerBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("summoner", 25.0)
	cfg.AI.SummonCooldown = 6.0
	cfg.AI.MaxSummons = 3
	ai := NewEnemyAI(cfg)

	assert.Equal(t, BehaviorSummoner, ai.Behavior)
	assert.Equal(t, 6.0, ai.SummonCooldown)
	assert.Equal(t, 3, ai.MaxSummons)
}

func TestEnemyAI_FindTarget_NoPlayers(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	ctx := &EnemyAIContext{
		Players:      make(map[string]*Player),
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.findTarget(enemy, ctx)

	assert.Equal(t, "", enemy.AI.TargetID)
}

func TestEnemyAI_FindTarget_PlayerInRange(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 10, Y: 0, Z: 0} // Within aggro range

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.findTarget(enemy, ctx)

	assert.Equal(t, "player-1", enemy.AI.TargetID)
	assert.Equal(t, AIStateChase, enemy.AI.State)
}

func TestEnemyAI_FindTarget_PlayerOutOfRange(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 50, Y: 0, Z: 0} // Out of aggro range

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.findTarget(enemy, ctx)

	assert.Equal(t, "", enemy.AI.TargetID)
}

func TestEnemyAI_FindTarget_ClosestPlayer(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 20.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	player1 := NewPlayer("player-1", "FarPlayer")
	player1.Position = Vector3{X: 15, Y: 0, Z: 0}

	player2 := NewPlayer("player-2", "ClosePlayer")
	player2.Position = Vector3{X: 5, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player1, "player-2": player2},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.findTarget(enemy, ctx)

	assert.Equal(t, "player-2", enemy.AI.TargetID) // Should target closer player
}

func TestEnemyAI_UpdateState_IdleBehavior(t *testing.T) {
	cfg := createTestEnemyConfig("idle", 0)
	enemy := createTestEnemy("enemy-1", "basic", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 5, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.Update(enemy, ctx)

	// Idle enemies should stay idle regardless of player position
	assert.Equal(t, AIStateIdle, enemy.AI.State)
}

func TestEnemyAI_UpdateState_ChaseToAttack(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 1.5, Y: 0, Z: 0} // Within attack range (2.0)

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateChase

	enemy.AI.updateState(enemy, ctx)

	assert.Equal(t, AIStateAttack, enemy.AI.State)
}

func TestEnemyAI_RageMode(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	cfg.AI.RageThreshold = 0.3 // Rage at 30% health
	enemy := createTestEnemy("enemy-1", "charger", Vector3{X: 0, Y: 0, Z: 0}, cfg)
	enemy.AI.RageThreshold = 0.3

	// Above threshold
	enemy.Health = 50
	enemy.AI.checkRageMode(enemy)
	assert.False(t, enemy.AI.RageMode)

	// Below threshold
	enemy.Health = 25
	enemy.AI.checkRageMode(enemy)
	assert.True(t, enemy.AI.RageMode)
}

func TestEnemyAI_FleeState(t *testing.T) {
	cfg := createTestEnemyConfig("ranged", 20.0)
	cfg.AI.FleeHealth = 0.25 // Flee at 25% health
	enemy := createTestEnemy("enemy-1", "archer", Vector3{X: 0, Y: 0, Z: 0}, cfg)
	enemy.AI.FleeHealth = 0.25

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 5, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.TargetID = "player-1"
	enemy.Health = 20 // Below flee threshold

	enemy.AI.updateState(enemy, ctx)

	assert.Equal(t, AIStateFlee, enemy.AI.State)
}

func TestEnemyAI_ExecuteChase_MovesTowardsPlayer(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 10, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 1.0, // 1 second for easier calculation
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateChase

	enemy.AI.executeChase(enemy, ctx)

	// Enemy should have moved towards player
	assert.True(t, enemy.Position.X > 0) // Moved in positive X direction
	assert.Equal(t, 0.0, enemy.Position.Z)
}

func TestEnemyAI_ExecuteFlee_MovesAwayFromPlayer(t *testing.T) {
	cfg := createTestEnemyConfig("ranged", 20.0)
	enemy := createTestEnemy("enemy-1", "archer", Vector3{X: 5, Y: 0, Z: 0}, cfg)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 10, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 1.0,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateFlee

	enemy.AI.executeFlee(enemy, ctx)

	// Enemy should have moved away from player (negative X direction)
	assert.True(t, enemy.Position.X < 5)
}

func TestEnemyAI_ExecuteAttack_MeleeDealsDamage(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)
	enemy.AI.LastAttackTime = time.Now().Add(-2 * time.Second) // Cooldown expired

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 1, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateAttack

	result := enemy.AI.executeAttack(enemy, ctx)

	assert.NotNil(t, result)
	assert.Equal(t, "player-1", result.TargetID)
	assert.True(t, result.Damage > 0)
	assert.Equal(t, DamageTypePhysical, result.DamageType)
}

func TestEnemyAI_ExecuteAttack_RangedSpawnsProjectile(t *testing.T) {
	cfg := createTestEnemyConfig("ranged", 20.0)
	enemy := createTestEnemy("enemy-1", "archer", Vector3{X: 0, Y: 0, Z: 0}, cfg)
	enemy.AI.LastAttackTime = time.Now().Add(-2 * time.Second)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 10, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateAttack

	result := enemy.AI.executeAttack(enemy, ctx)

	assert.NotNil(t, result)
	assert.True(t, result.IsProjectile)
}

func TestEnemyAI_ExecuteAttack_CooldownRespected(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)
	enemy.AI.LastAttackTime = time.Now() // Just attacked

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 1, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateAttack

	result := enemy.AI.executeAttack(enemy, ctx)

	// Should not attack yet (still on cooldown)
	assert.Nil(t, result)
}

func TestEnemyAI_SupportBuffsAllies(t *testing.T) {
	cfg := createTestEnemyConfig("support", 20.0)
	cfg.AI.SupportRange = 10.0
	enemy := createTestEnemy("enemy-1", "shaman", Vector3{X: 0, Y: 0, Z: 0}, cfg)
	enemy.AI.LastAttackTime = time.Now().Add(-5 * time.Second)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 5, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 0.016,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateSupport

	result := enemy.AI.executeSupport(enemy, ctx)

	assert.NotNil(t, result)
	assert.NotNil(t, result.ApplyBuff)
	assert.True(t, result.ApplyBuff.DamageMult > 1.0)
}

func TestEnemyAI_StunPreventsMovement(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	// Apply stun
	stun := NewStatusEffect(StatusEffectStun, 5.0, 1.0, "player-1")
	enemy.ApplyStatusEffect(stun)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 10, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 1.0,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateChase

	enemy.AI.executeChase(enemy, ctx)

	// Enemy should not have moved
	assert.Equal(t, 0.0, enemy.Position.X)
	assert.Equal(t, 0.0, enemy.Velocity.X)
}

func TestEnemyAI_SlowReducesSpeed(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	// Apply slow (50% reduction)
	slow := NewStatusEffect(StatusEffectSlow, 5.0, 0.5, "player-1")
	enemy.ApplyStatusEffect(slow)

	player := NewPlayer("player-1", "TestPlayer")
	player.Position = Vector3{X: 10, Y: 0, Z: 0}

	ctx := &EnemyAIContext{
		Players:      map[string]*Player{"player-1": player},
		Enemies:      map[string]*Enemy{"enemy-1": enemy},
		DeltaSeconds: 1.0,
	}

	enemy.AI.TargetID = "player-1"
	enemy.AI.State = AIStateChase

	enemy.AI.executeChase(enemy, ctx)

	// Enemy should move at reduced speed
	// Normal speed = 5.0, slowed = 5.0 * 0.5 = 2.5
	assert.True(t, enemy.Position.X > 0)
	assert.True(t, enemy.Position.X < 5.0) // Less than full speed would give
}

func TestEnemy_ApplyBuff(t *testing.T) {
	cfg := createTestEnemyConfig("melee", 15.0)
	enemy := createTestEnemy("enemy-1", "zombie", Vector3{X: 0, Y: 0, Z: 0}, cfg)

	enemy.ApplyBuff(1.25, 1.15, 5.0)

	assert.Equal(t, 1.25, enemy.DamageBuff)
	assert.Equal(t, 1.15, enemy.SpeedBuff)
	assert.True(t, time.Now().Before(enemy.BuffExpireTime))
}

func TestFindNearestPlayer(t *testing.T) {
	player1 := NewPlayer("player-1", "Far")
	player1.Position = Vector3{X: 20, Y: 0, Z: 0}

	player2 := NewPlayer("player-2", "Close")
	player2.Position = Vector3{X: 5, Y: 0, Z: 0}

	player3 := NewPlayer("player-3", "TooFar")
	player3.Position = Vector3{X: 100, Y: 0, Z: 0}

	players := map[string]*Player{
		"player-1": player1,
		"player-2": player2,
		"player-3": player3,
	}

	pos := Vector3{X: 0, Y: 0, Z: 0}

	nearest := FindNearestPlayer(pos, players, 30.0)

	assert.NotNil(t, nearest)
	assert.Equal(t, "player-2", nearest.ID)
}

func TestFindNearestPlayer_DeadPlayersIgnored(t *testing.T) {
	player1 := NewPlayer("player-1", "Dead")
	player1.Position = Vector3{X: 5, Y: 0, Z: 0}
	player1.Health = 0 // Dead

	player2 := NewPlayer("player-2", "Alive")
	player2.Position = Vector3{X: 10, Y: 0, Z: 0}
	player2.Health = 100

	players := map[string]*Player{
		"player-1": player1,
		"player-2": player2,
	}

	pos := Vector3{X: 0, Y: 0, Z: 0}

	nearest := FindNearestPlayer(pos, players, 30.0)

	assert.NotNil(t, nearest)
	assert.Equal(t, "player-2", nearest.ID) // Should ignore dead player
}
