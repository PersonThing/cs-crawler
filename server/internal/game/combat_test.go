package game

import (
	"testing"
)

func TestCalculateDamage(t *testing.T) {
	baseDamage := 100.0
	damageType := DamageTypeFire

	result := CalculateDamage(baseDamage, damageType)

	if result != baseDamage {
		t.Errorf("Expected damage %f, got %f", baseDamage, result)
	}
}

func TestDistance3D(t *testing.T) {
	a := Vector3{X: 0, Y: 0, Z: 0}
	b := Vector3{X: 3, Y: 4, Z: 0}

	distance := Distance3D(a, b)
	expected := 5.0

	if distance != expected {
		t.Errorf("Expected distance %f, got %f", expected, distance)
	}
}

func TestDistance2D(t *testing.T) {
	// Test horizontal distance only (ignoring Y)
	a := Vector3{X: 0, Y: 0, Z: 0}
	b := Vector3{X: 3, Y: 100, Z: 4}  // Y=100 should be ignored

	distance := Distance2D(a, b)
	expected := 5.0  // sqrt(3^2 + 4^2) = 5

	if distance != expected {
		t.Errorf("Expected distance %f, got %f", expected, distance)
	}
}

func TestDistance2DIgnoresHeight(t *testing.T) {
	// Projectile at different height should still be same 2D distance
	projectile := Vector3{X: 5, Y: 0.9, Z: 5}
	enemy := Vector3{X: 5, Y: 0, Z: 5}

	distance := Distance2D(projectile, enemy)
	expected := 0.0  // Same X,Z position

	if distance != expected {
		t.Errorf("Expected distance %f, got %f", expected, distance)
	}
}

func TestCheckProjectileCollision(t *testing.T) {
	projectile := &Projectile{
		Position: Vector3{X: 5, Y: 0, Z: 5},
	}

	enemies := map[string]*Enemy{
		"e1": {
			ID:       "e1",
			Position: Vector3{X: 5, Y: 0, Z: 5.3},
			Dead:     false,
		},
		"e2": {
			ID:       "e2",
			Position: Vector3{X: 10, Y: 0, Z: 10},
			Dead:     false,
		},
	}

	// Should hit e1 (within 0.5 radius)
	hit := CheckProjectileCollision(projectile, enemies, 0.5)
	if hit == nil || hit.ID != "e1" {
		t.Errorf("Expected to hit enemy e1, got %v", hit)
	}

	// Should not hit with very small radius
	hit = CheckProjectileCollision(projectile, enemies, 0.1)
	if hit != nil {
		t.Errorf("Expected no hit with small radius, got %v", hit)
	}
}

func TestCheckProjectileCollisionWithDeadEnemy(t *testing.T) {
	projectile := &Projectile{
		Position: Vector3{X: 5, Y: 0, Z: 5},
	}

	enemies := map[string]*Enemy{
		"e1": {
			ID:       "e1",
			Position: Vector3{X: 5, Y: 0, Z: 5},
			Dead:     true, // Dead enemy
		},
	}

	// Should not hit dead enemies
	hit := CheckProjectileCollision(projectile, enemies, 1.0)
	if hit != nil {
		t.Errorf("Expected no hit on dead enemy, got %v", hit)
	}
}

func TestEnemyTakeDamage(t *testing.T) {
	enemy := NewEnemy("e1", "basic", Vector3{X: 0, Y: 0, Z: 0})
	enemy.Health = 100
	enemy.MaxHealth = 100

	damageInfo := DamageInfo{
		Amount:   30,
		Type:     DamageTypeFire,
		SourceID: "player1",
		TargetID: enemy.ID,
	}

	died := enemy.TakeDamage(damageInfo)

	if died {
		t.Error("Enemy should not have died from 30 damage")
	}
	if enemy.Health != 70 {
		t.Errorf("Expected health 70, got %f", enemy.Health)
	}
	if enemy.Dead {
		t.Error("Enemy should not be marked as dead")
	}
}

func TestEnemyDeath(t *testing.T) {
	enemy := NewEnemy("e1", "basic", Vector3{X: 0, Y: 0, Z: 0})
	enemy.Health = 10
	enemy.MaxHealth = 100

	damageInfo := DamageInfo{
		Amount:   50,
		Type:     DamageTypeFire,
		SourceID: "player1",
		TargetID: enemy.ID,
	}

	died := enemy.TakeDamage(damageInfo)

	if !died {
		t.Error("Enemy should have died from lethal damage")
	}
	if enemy.Health != 0 {
		t.Errorf("Expected health 0, got %f", enemy.Health)
	}
	if !enemy.Dead {
		t.Error("Enemy should be marked as dead")
	}
}

func TestEnemyIsDead(t *testing.T) {
	enemy := NewEnemy("e1", "basic", Vector3{X: 0, Y: 0, Z: 0})

	if enemy.IsDead() {
		t.Error("New enemy should not be dead")
	}

	enemy.Dead = true

	if !enemy.IsDead() {
		t.Error("Enemy marked as dead should return true from IsDead()")
	}
}

func TestApplyDamage(t *testing.T) {
	enemy := NewEnemy("e1", "basic", Vector3{X: 0, Y: 0, Z: 0})
	enemy.Health = 50

	damageInfo := DamageInfo{
		Amount:   30,
		Type:     DamageTypeFire,
		SourceID: "player1",
		TargetID: enemy.ID,
	}

	died := ApplyDamage(enemy, damageInfo)

	if died {
		t.Error("Enemy should not have died")
	}
	if enemy.Health != 20 {
		t.Errorf("Expected health 20, got %f", enemy.Health)
	}
}
