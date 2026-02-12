package game

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Helper to create a test world without initial enemies
func newTestWorldWithoutEnemies() *World {
	w := &World{
		ID:          "test-world",
		players:     make(map[string]*Player),
		enemies:     make(map[string]*Enemy),
		projectiles: make(map[string]*Projectile),
		minions:     make(map[string]*Minion),
		groundItems: make(map[string]*GroundItem),
		nextItemID:  1,
	}
	return w
}

// === PickupItem Tests ===

func TestPickupItem_Success(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	// Add a player
	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 5.0, Y: 0, Z: 5.0}
	world.players["player-1"] = player

	// Add a ground item near the player
	item := NewItem("item-1", ItemTypeHead, 10)
	groundItem := NewGroundItem("ground-1", item, Vector3{X: 5.0, Y: 0, Z: 6.0}) // 1 unit away
	world.groundItems["ground-1"] = groundItem

	// Pick up the item
	err := world.PickupItem("player-1", "ground-1")

	assert.NoError(t, err)
	assert.NotContains(t, world.groundItems, "ground-1") // Ground item removed
}

func TestPickupItem_AutoEquip_EmptySlot(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 0, Y: 0, Z: 0}
	world.players["player-1"] = player

	item := NewItem("item-1", ItemTypeHead, 10)
	groundItem := NewGroundItem("ground-1", item, Vector3{X: 0, Y: 0, Z: 0})
	world.groundItems["ground-1"] = groundItem

	err := world.PickupItem("player-1", "ground-1")

	assert.NoError(t, err)
	// Should be auto-equipped since head slot was empty
	assert.Equal(t, item, player.Inventory.Equipment[SlotHead])
}

func TestPickupItem_AddsToBag_SlotOccupied(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 0, Y: 0, Z: 0}
	// Pre-equip a helmet
	existingHelm := &Item{ID: "existing", Type: ItemTypeHead, Affixes: []ItemAffix{}}
	player.Inventory.EquipItem(existingHelm)
	world.players["player-1"] = player

	newItem := NewItem("item-1", ItemTypeHead, 10)
	groundItem := NewGroundItem("ground-1", newItem, Vector3{X: 0, Y: 0, Z: 0})
	world.groundItems["ground-1"] = groundItem

	err := world.PickupItem("player-1", "ground-1")

	assert.NoError(t, err)
	// Should NOT replace equipped helm
	assert.Equal(t, existingHelm, player.Inventory.Equipment[SlotHead])
	// Should be in bag instead
	assert.Equal(t, newItem, player.Inventory.Bags[0])
}

func TestPickupItem_TooFar(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 0, Y: 0, Z: 0}
	world.players["player-1"] = player

	item := NewItem("item-1", ItemTypeHead, 10)
	groundItem := NewGroundItem("ground-1", item, Vector3{X: 10.0, Y: 0, Z: 10.0}) // Far away
	world.groundItems["ground-1"] = groundItem

	err := world.PickupItem("player-1", "ground-1")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "too far")
	// Item should still be on ground
	assert.Contains(t, world.groundItems, "ground-1")
}

func TestPickupItem_PlayerNotFound(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	item := NewItem("item-1", ItemTypeHead, 10)
	groundItem := NewGroundItem("ground-1", item, Vector3{X: 0, Y: 0, Z: 0})
	world.groundItems["ground-1"] = groundItem

	err := world.PickupItem("nonexistent-player", "ground-1")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "player not found")
}

func TestPickupItem_ItemNotFound(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 0, Y: 0, Z: 0}
	world.players["player-1"] = player

	err := world.PickupItem("player-1", "nonexistent-item")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ground item not found")
}

func TestPickupItem_FullInventory(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 0, Y: 0, Z: 0}
	// Fill all bag slots
	for i := 0; i < 60; i++ {
		player.Inventory.Bags[i] = &Item{ID: fmt.Sprintf("filler-%d", i), Type: ItemTypeRing, Affixes: []ItemAffix{}}
	}
	// Also fill all equipment slots
	player.Inventory.Equipment[SlotHead] = &Item{ID: "eq-head", Type: ItemTypeHead, Affixes: []ItemAffix{}}
	player.Inventory.Equipment[SlotChest] = &Item{ID: "eq-chest", Type: ItemTypeChest, Affixes: []ItemAffix{}}
	player.Inventory.Equipment[SlotHands] = &Item{ID: "eq-hands", Type: ItemTypeHands, Affixes: []ItemAffix{}}
	player.Inventory.Equipment[SlotFeet] = &Item{ID: "eq-feet", Type: ItemTypeFeet, Affixes: []ItemAffix{}}
	player.Inventory.Equipment[SlotWeapon1] = &Item{ID: "eq-weapon", Type: ItemTypeWeapon1H, Affixes: []ItemAffix{}}
	player.Inventory.Equipment[SlotAmulet] = &Item{ID: "eq-amulet", Type: ItemTypeAmulet, Affixes: []ItemAffix{}}
	player.Inventory.Equipment[SlotRing1] = &Item{ID: "eq-ring1", Type: ItemTypeRing, Affixes: []ItemAffix{}}
	player.Inventory.Equipment[SlotRing2] = &Item{ID: "eq-ring2", Type: ItemTypeRing, Affixes: []ItemAffix{}}
	world.players["player-1"] = player

	// Try to pick up another item (will go to head slot which is occupied, then try bag)
	newItem := NewItem("item-1", ItemTypeHead, 10)
	groundItem := NewGroundItem("ground-1", newItem, Vector3{X: 0, Y: 0, Z: 0})
	world.groundItems["ground-1"] = groundItem

	err := world.PickupItem("player-1", "ground-1")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "inventory is full")
	// Item should still be on ground
	assert.Contains(t, world.groundItems, "ground-1")
}

// === DropItemFromInventory Tests ===

func TestDropItemFromInventory_FromBag(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 10.0, Y: 0, Z: 10.0}
	item := &Item{ID: "bag-item", Name: "Test Item", Type: ItemTypeHead, Affixes: []ItemAffix{}}
	player.Inventory.Bags[5] = item
	world.players["player-1"] = player

	err := world.DropItemFromInventory("player-1", "bag", float64(5))

	assert.NoError(t, err)
	// Item removed from bag
	assert.Nil(t, player.Inventory.Bags[5])
	// Ground item created
	assert.Len(t, world.groundItems, 1)

	// Check ground item properties
	for _, gi := range world.groundItems {
		assert.Equal(t, item, gi.Item)
		// Should be near player position
		assert.InDelta(t, player.Position.X, gi.Position.X, 5.0)
		assert.InDelta(t, player.Position.Z, gi.Position.Z, 5.0)
	}
}

func TestDropItemFromInventory_FromEquipment(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	player.Position = Vector3{X: 10.0, Y: 0, Z: 10.0}
	helm := &Item{ID: "helm", Name: "Test Helm", Type: ItemTypeHead, Affixes: []ItemAffix{{Stat: StatHealth, Value: 50}}}
	player.Inventory.EquipItem(helm)
	player.RecalculateStats()
	world.players["player-1"] = player

	initialHealth := player.MaxHealth

	err := world.DropItemFromInventory("player-1", "equipment", "head")

	assert.NoError(t, err)
	// Item removed from equipment
	assert.Nil(t, player.Inventory.Equipment[SlotHead])
	// Stats should be recalculated (health should decrease)
	assert.Less(t, player.MaxHealth, initialHealth)
	// Ground item created
	assert.Len(t, world.groundItems, 1)
}

func TestDropItemFromInventory_PlayerNotFound(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	err := world.DropItemFromInventory("nonexistent", "bag", float64(0))

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "player not found")
}

func TestDropItemFromInventory_InvalidSource(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	world.players["player-1"] = player

	err := world.DropItemFromInventory("player-1", "invalid", 0)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid source")
}

func TestDropItemFromInventory_EmptyBagSlot(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	world.players["player-1"] = player

	err := world.DropItemFromInventory("player-1", "bag", float64(0))

	assert.Error(t, err)
}

func TestDropItemFromInventory_EmptyEquipmentSlot(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	world.players["player-1"] = player

	err := world.DropItemFromInventory("player-1", "equipment", "head")

	assert.Error(t, err)
}

// === SwapBagItems Tests ===

func TestSwapBagItems_Success(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	item1 := &Item{ID: "item-1", Type: ItemTypeHead, Affixes: []ItemAffix{}}
	item2 := &Item{ID: "item-2", Type: ItemTypeChest, Affixes: []ItemAffix{}}
	player.Inventory.Bags[0] = item1
	player.Inventory.Bags[5] = item2
	world.players["player-1"] = player

	err := world.SwapBagItems("player-1", 0, 5)

	assert.NoError(t, err)
	assert.Equal(t, item2, player.Inventory.Bags[0])
	assert.Equal(t, item1, player.Inventory.Bags[5])
}

func TestSwapBagItems_PlayerNotFound(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	err := world.SwapBagItems("nonexistent", 0, 1)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "player not found")
}

// === Drop Position Tests ===

func TestFindOpenDropPosition_OriginClear(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	origin := Vector3{X: 10.0, Y: 0, Z: 10.0}
	result := world.findOpenDropPosition(origin)

	assert.Equal(t, origin, result)
}

func TestFindOpenDropPosition_OriginOccupied(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	// Place an item at origin
	existingItem := NewGroundItem("existing", &Item{ID: "existing"}, Vector3{X: 10.0, Y: 0, Z: 10.0})
	world.groundItems["existing"] = existingItem

	origin := Vector3{X: 10.0, Y: 0, Z: 10.0}
	result := world.findOpenDropPosition(origin)

	// Result should be different from origin (spread out)
	assert.NotEqual(t, origin.X, result.X)
}

func TestFindOpenDropPosition_MultipleItemsSpreadOut(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	// Drop multiple items at same location
	origin := Vector3{X: 5.0, Y: 0, Z: 5.0}
	positions := make([]Vector3, 0)

	for i := 0; i < 5; i++ {
		pos := world.findOpenDropPosition(origin)
		positions = append(positions, pos)

		// Add item at this position
		gi := NewGroundItem(fmt.Sprintf("item-%d", i), &Item{ID: fmt.Sprintf("item-%d", i)}, pos)
		world.groundItems[gi.ID] = gi
	}

	// All positions should be different
	for i := 0; i < len(positions); i++ {
		for j := i + 1; j < len(positions); j++ {
			dist := Distance2D(positions[i], positions[j])
			assert.GreaterOrEqual(t, dist, 0.5, "Items should be spread out")
		}
	}
}

// === World State Tests ===

func TestGetWorldState_IncludesGroundItems(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	player := NewPlayer("player-1", "TestUser")
	world.players["player-1"] = player

	item := NewItem("item-1", ItemTypeHead, 10)
	groundItem := NewGroundItem("ground-1", item, Vector3{X: 5.0, Y: 0, Z: 5.0})
	world.groundItems["ground-1"] = groundItem

	state := world.GetWorldState()

	groundItems := state["groundItems"].([]map[string]interface{})
	require.Len(t, groundItems, 1)
	assert.Equal(t, "ground-1", groundItems[0]["id"])
	assert.NotNil(t, groundItems[0]["item"])
}

// === Loot Drop Tests ===

func TestDropLoot_CreatesGroundItem(t *testing.T) {
	world := newTestWorldWithoutEnemies()

	enemy := &Enemy{
		ID:       "enemy-1",
		Position: Vector3{X: 10.0, Y: 0, Z: 10.0},
	}

	// Drop loot multiple times to ensure at least one drop (70% chance)
	droppedCount := 0
	for i := 0; i < 20; i++ {
		world.dropLoot(enemy)
		droppedCount = len(world.groundItems)
		if droppedCount > 0 {
			break
		}
	}

	// Should have at least one drop after 20 attempts
	assert.Greater(t, droppedCount, 0, "Should have dropped at least one item")

	// Check ground item properties
	for _, gi := range world.groundItems {
		assert.NotEmpty(t, gi.ID)
		assert.NotNil(t, gi.Item)
		assert.InDelta(t, enemy.Position.X, gi.Position.X, 5.0)
		assert.InDelta(t, enemy.Position.Z, gi.Position.Z, 5.0)
	}
}
