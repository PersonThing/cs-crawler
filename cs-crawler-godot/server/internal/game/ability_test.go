package game

import (
	"testing"
	"time"
)

func TestNewAbilityManager(t *testing.T) {
	am := NewAbilityManager()

	if am == nil {
		t.Fatal("NewAbilityManager returned nil")
	}

	if am.abilities == nil {
		t.Error("abilities map not initialized")
	}

	if am.lastUsed == nil {
		t.Error("lastUsed map not initialized")
	}

	// Should have fireball ability registered by default
	if _, ok := am.abilities[AbilityFireball]; !ok {
		t.Error("Fireball ability not registered by default")
	}
}

func TestCanUseAbility(t *testing.T) {
	am := NewAbilityManager()

	// Should be able to use ability initially
	if !am.CanUseAbility(AbilityFireball) {
		t.Error("Should be able to use ability initially")
	}

	// Use the ability
	_, err := am.UseAbility(AbilityFireball)
	if err != nil {
		t.Fatalf("Failed to use ability: %v", err)
	}

	// Should not be able to use immediately after
	if am.CanUseAbility(AbilityFireball) {
		t.Error("Should not be able to use ability on cooldown")
	}
}

func TestCanUseAbilityAfterCooldown(t *testing.T) {
	am := NewAbilityManager()

	// Override with short cooldown for testing
	am.abilities[AbilityFireball].Cooldown = 0.1 // 100ms

	// Use the ability
	_, err := am.UseAbility(AbilityFireball)
	if err != nil {
		t.Fatalf("Failed to use ability: %v", err)
	}

	// Should not be able to use immediately
	if am.CanUseAbility(AbilityFireball) {
		t.Error("Should not be able to use ability immediately")
	}

	// Wait for cooldown
	time.Sleep(150 * time.Millisecond)

	// Should be able to use after cooldown
	if !am.CanUseAbility(AbilityFireball) {
		t.Error("Should be able to use ability after cooldown")
	}
}

func TestUseAbility(t *testing.T) {
	am := NewAbilityManager()

	ability, err := am.UseAbility(AbilityFireball)
	if err != nil {
		t.Fatalf("Failed to use ability: %v", err)
	}

	if ability == nil {
		t.Fatal("UseAbility returned nil ability")
	}

	if ability.Type != AbilityFireball {
		t.Errorf("Expected ability type %s, got %s", AbilityFireball, ability.Type)
	}
}

func TestUseAbilityOnCooldown(t *testing.T) {
	am := NewAbilityManager()

	// Use ability first time
	_, err := am.UseAbility(AbilityFireball)
	if err != nil {
		t.Fatalf("Failed to use ability first time: %v", err)
	}

	// Try to use again immediately
	_, err = am.UseAbility(AbilityFireball)
	if err == nil {
		t.Error("Expected error when using ability on cooldown")
	}
}

func TestUseNonexistentAbility(t *testing.T) {
	am := NewAbilityManager()

	_, err := am.UseAbility("nonexistent")
	if err == nil {
		t.Error("Expected error when using nonexistent ability")
	}
}

func TestGetRemainingCooldown(t *testing.T) {
	am := NewAbilityManager()

	// Initially no cooldown
	remaining := am.GetRemainingCooldown(AbilityFireball)
	if remaining != 0 {
		t.Errorf("Expected 0 cooldown initially, got %f", remaining)
	}

	// Use ability
	am.UseAbility(AbilityFireball)

	// Should have cooldown now
	remaining = am.GetRemainingCooldown(AbilityFireball)
	if remaining <= 0 {
		t.Error("Expected positive cooldown after use")
	}

	ability := am.abilities[AbilityFireball]
	if remaining > ability.Cooldown {
		t.Errorf("Remaining cooldown %f exceeds total cooldown %f", remaining, ability.Cooldown)
	}
}

func TestGetFireballAbility(t *testing.T) {
	fireball := GetFireballAbility()

	if fireball == nil {
		t.Fatal("GetFireballAbility returned nil")
	}

	if fireball.Type != AbilityFireball {
		t.Errorf("Expected type %s, got %s", AbilityFireball, fireball.Type)
	}

	if fireball.DamageType != DamageTypeFire {
		t.Errorf("Expected damage type %s, got %s", DamageTypeFire, fireball.DamageType)
	}

	if fireball.Damage <= 0 {
		t.Error("Fireball should have positive damage")
	}

	if fireball.Cooldown <= 0 {
		t.Error("Fireball should have positive cooldown")
	}

	if fireball.Speed <= 0 {
		t.Error("Fireball should have positive speed")
	}
}

func TestRegisterAbility(t *testing.T) {
	am := NewAbilityManager()

	customAbility := &Ability{
		Type:       "custom",
		Name:       "Custom Ability",
		Cooldown:   5.0,
		Damage:     50.0,
		DamageType: DamageTypeLightning,
	}

	am.RegisterAbility(customAbility)

	if _, ok := am.abilities["custom"]; !ok {
		t.Error("Custom ability not registered")
	}

	// Should be able to use custom ability
	if !am.CanUseAbility("custom") {
		t.Error("Should be able to use custom ability")
	}
}

func TestAbilitySerialize(t *testing.T) {
	fireball := GetFireballAbility()
	serialized := fireball.Serialize()

	if serialized["type"] != string(AbilityFireball) {
		t.Errorf("Expected type %s in serialization", AbilityFireball)
	}

	if serialized["damage"] != fireball.Damage {
		t.Error("Damage not serialized correctly")
	}

	if serialized["cooldown"] != fireball.Cooldown {
		t.Error("Cooldown not serialized correctly")
	}
}
