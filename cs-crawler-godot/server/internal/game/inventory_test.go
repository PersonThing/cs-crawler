package game

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// === Inventory Creation Tests ===

func TestNewInventory_CreatesEmptyInventory(t *testing.T) {
	inv := NewInventory()

	require.NotNil(t, inv)
	assert.Len(t, inv.Equipment, 9) // 9 equipment slots
	assert.Len(t, inv.Bags, 60)     // 60 bag slots
	assert.Equal(t, 60, inv.MaxBagSlots)
	assert.Empty(t, inv.SetPieces)

	// All equipment slots should be nil
	for slot, item := range inv.Equipment {
		assert.Nil(t, item, "Equipment slot %s should be nil", slot)
	}

	// All bag slots should be nil
	for i, item := range inv.Bags {
		assert.Nil(t, item, "Bag slot %d should be nil", i)
	}
}

// === Equipment Tests ===

func TestEquipItem_SingleSlotItem(t *testing.T) {
	inv := NewInventory()
	helmet := &Item{ID: "helm-1", Type: ItemTypeHead, Level: 10}

	unequipped, err := inv.EquipItem(helmet)

	assert.NoError(t, err)
	assert.Nil(t, unequipped)
	assert.Equal(t, helmet, inv.Equipment[SlotHead])
}

func TestEquipItem_ReplacesExisting(t *testing.T) {
	inv := NewInventory()
	oldHelm := &Item{ID: "helm-old", Type: ItemTypeHead}
	newHelm := &Item{ID: "helm-new", Type: ItemTypeHead}

	inv.EquipItem(oldHelm)
	unequipped, err := inv.EquipItem(newHelm)

	assert.NoError(t, err)
	assert.Equal(t, oldHelm, unequipped)
	assert.Equal(t, newHelm, inv.Equipment[SlotHead])
}

func TestEquipItem_NilItem(t *testing.T) {
	inv := NewInventory()

	_, err := inv.EquipItem(nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot equip nil")
}

func TestEquipItem_1HWeapon_PrefersEmptySlot(t *testing.T) {
	inv := NewInventory()
	sword1 := &Item{ID: "sword-1", Type: ItemTypeWeapon1H}
	sword2 := &Item{ID: "sword-2", Type: ItemTypeWeapon1H}

	// First weapon goes to weapon1
	inv.EquipItem(sword1)
	assert.Equal(t, sword1, inv.Equipment[SlotWeapon1])
	assert.Nil(t, inv.Equipment[SlotWeapon2])

	// Second weapon goes to weapon2
	inv.EquipItem(sword2)
	assert.Equal(t, sword1, inv.Equipment[SlotWeapon1])
	assert.Equal(t, sword2, inv.Equipment[SlotWeapon2])
}

func TestEquipItem_2HWeapon_ClearsBothSlots(t *testing.T) {
	inv := NewInventory()
	sword := &Item{ID: "sword", Type: ItemTypeWeapon1H}
	offhand := &Item{ID: "offhand", Type: ItemTypeWeapon1H}
	greatsword := &Item{ID: "greatsword", Type: ItemTypeWeapon2H}

	// Equip two 1H weapons
	inv.EquipItem(sword)
	inv.EquipItem(offhand)
	assert.Equal(t, sword, inv.Equipment[SlotWeapon1])
	assert.Equal(t, offhand, inv.Equipment[SlotWeapon2])

	// Equip 2H weapon - should clear both
	unequipped, err := inv.EquipItem(greatsword)

	assert.NoError(t, err)
	assert.Equal(t, sword, unequipped) // Returns main hand
	assert.Equal(t, greatsword, inv.Equipment[SlotWeapon1])
	assert.Nil(t, inv.Equipment[SlotWeapon2])
}

func TestEquipItem_1HWeapon_Replaces2HWeapon(t *testing.T) {
	inv := NewInventory()
	greatsword := &Item{ID: "greatsword", Type: ItemTypeWeapon2H}
	dagger := &Item{ID: "dagger", Type: ItemTypeWeapon1H}

	inv.EquipItem(greatsword)
	assert.Equal(t, greatsword, inv.Equipment[SlotWeapon1])

	// Equip 1H should replace 2H
	unequipped, err := inv.EquipItem(dagger)

	assert.NoError(t, err)
	assert.Equal(t, greatsword, unequipped)
	assert.Equal(t, dagger, inv.Equipment[SlotWeapon1])
	assert.Nil(t, inv.Equipment[SlotWeapon2])
}

func TestEquipItem_Ring_PrefersEmptySlot(t *testing.T) {
	inv := NewInventory()
	ring1 := &Item{ID: "ring-1", Type: ItemTypeRing}
	ring2 := &Item{ID: "ring-2", Type: ItemTypeRing}
	ring3 := &Item{ID: "ring-3", Type: ItemTypeRing}

	// First ring goes to ring1
	inv.EquipItem(ring1)
	assert.Equal(t, ring1, inv.Equipment[SlotRing1])
	assert.Nil(t, inv.Equipment[SlotRing2])

	// Second ring goes to ring2
	inv.EquipItem(ring2)
	assert.Equal(t, ring1, inv.Equipment[SlotRing1])
	assert.Equal(t, ring2, inv.Equipment[SlotRing2])

	// Third ring replaces ring1
	unequipped, _ := inv.EquipItem(ring3)
	assert.Equal(t, ring1, unequipped)
	assert.Equal(t, ring3, inv.Equipment[SlotRing1])
}

// === Unequip Tests ===

func TestUnequipItem_RemovesItem(t *testing.T) {
	inv := NewInventory()
	helm := &Item{ID: "helm", Type: ItemTypeHead}
	inv.EquipItem(helm)

	unequipped, err := inv.UnequipItem(SlotHead)

	assert.NoError(t, err)
	assert.Equal(t, helm, unequipped)
	assert.Nil(t, inv.Equipment[SlotHead])
}

func TestUnequipItem_EmptySlot(t *testing.T) {
	inv := NewInventory()

	_, err := inv.UnequipItem(SlotHead)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no item equipped")
}

func TestUnequipItem_2HWeapon_ClearsBothSlots(t *testing.T) {
	inv := NewInventory()
	greatsword := &Item{ID: "greatsword", Type: ItemTypeWeapon2H}
	inv.EquipItem(greatsword)

	// Weapon2 should also be nil after unequipping 2H from weapon1
	unequipped, err := inv.UnequipItem(SlotWeapon1)

	assert.NoError(t, err)
	assert.Equal(t, greatsword, unequipped)
	assert.Nil(t, inv.Equipment[SlotWeapon1])
	assert.Nil(t, inv.Equipment[SlotWeapon2])
}

// === Bag Tests ===

func TestAddToBag_AddsToFirstEmptySlot(t *testing.T) {
	inv := NewInventory()
	item := &Item{ID: "item-1", Type: ItemTypeHead}

	slot, err := inv.AddToBag(item)

	assert.NoError(t, err)
	assert.Equal(t, 0, slot)
	assert.Equal(t, item, inv.Bags[0])
}

func TestAddToBag_SkipsOccupiedSlots(t *testing.T) {
	inv := NewInventory()
	item1 := &Item{ID: "item-1", Type: ItemTypeHead}
	item2 := &Item{ID: "item-2", Type: ItemTypeChest}

	inv.AddToBag(item1)
	slot, err := inv.AddToBag(item2)

	assert.NoError(t, err)
	assert.Equal(t, 1, slot)
	assert.Equal(t, item1, inv.Bags[0])
	assert.Equal(t, item2, inv.Bags[1])
}

func TestAddToBag_NilItem(t *testing.T) {
	inv := NewInventory()

	_, err := inv.AddToBag(nil)

	assert.Error(t, err)
}

func TestAddToBag_FullBag(t *testing.T) {
	inv := NewInventory()

	// Fill all bag slots
	for i := 0; i < 60; i++ {
		item := &Item{ID: "item-" + string(rune(i)), Type: ItemTypeRing}
		inv.Bags[i] = item
	}

	newItem := &Item{ID: "extra", Type: ItemTypeHead}
	_, err := inv.AddToBag(newItem)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "bag is full")
}

func TestRemoveFromBag_RemovesItem(t *testing.T) {
	inv := NewInventory()
	item := &Item{ID: "item-1", Type: ItemTypeHead}
	inv.Bags[5] = item

	removed, err := inv.RemoveFromBag(5)

	assert.NoError(t, err)
	assert.Equal(t, item, removed)
	assert.Nil(t, inv.Bags[5])
}

func TestRemoveFromBag_InvalidSlot(t *testing.T) {
	inv := NewInventory()

	_, err := inv.RemoveFromBag(-1)
	assert.Error(t, err)

	_, err = inv.RemoveFromBag(60)
	assert.Error(t, err)

	_, err = inv.RemoveFromBag(100)
	assert.Error(t, err)
}

func TestRemoveFromBag_EmptySlot(t *testing.T) {
	inv := NewInventory()

	_, err := inv.RemoveFromBag(0)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no item in bag slot")
}

func TestGetBagItem_ReturnsItem(t *testing.T) {
	inv := NewInventory()
	item := &Item{ID: "item-1", Type: ItemTypeChest}
	inv.Bags[10] = item

	result := inv.GetBagItem(10)

	assert.Equal(t, item, result)
}

func TestGetBagItem_InvalidSlot(t *testing.T) {
	inv := NewInventory()

	assert.Nil(t, inv.GetBagItem(-1))
	assert.Nil(t, inv.GetBagItem(60))
}

func TestSwapBagItems_SwapsItems(t *testing.T) {
	inv := NewInventory()
	item1 := &Item{ID: "item-1", Type: ItemTypeHead}
	item2 := &Item{ID: "item-2", Type: ItemTypeChest}
	inv.Bags[0] = item1
	inv.Bags[5] = item2

	err := inv.SwapBagItems(0, 5)

	assert.NoError(t, err)
	assert.Equal(t, item2, inv.Bags[0])
	assert.Equal(t, item1, inv.Bags[5])
}

func TestSwapBagItems_SwapWithEmptySlot(t *testing.T) {
	inv := NewInventory()
	item := &Item{ID: "item-1", Type: ItemTypeHead}
	inv.Bags[0] = item

	err := inv.SwapBagItems(0, 10)

	assert.NoError(t, err)
	assert.Nil(t, inv.Bags[0])
	assert.Equal(t, item, inv.Bags[10])
}

func TestSwapBagItems_InvalidSlots(t *testing.T) {
	inv := NewInventory()

	err := inv.SwapBagItems(-1, 5)
	assert.Error(t, err)

	err = inv.SwapBagItems(0, 60)
	assert.Error(t, err)
}

func TestIsFull_EmptyBag(t *testing.T) {
	inv := NewInventory()
	assert.False(t, inv.IsFull())
}

func TestIsFull_PartialBag(t *testing.T) {
	inv := NewInventory()
	for i := 0; i < 30; i++ {
		inv.Bags[i] = &Item{ID: "item"}
	}
	assert.False(t, inv.IsFull())
}

func TestIsFull_FullBag(t *testing.T) {
	inv := NewInventory()
	for i := 0; i < 60; i++ {
		inv.Bags[i] = &Item{ID: "item"}
	}
	assert.True(t, inv.IsFull())
}

// === Set Tracking Tests ===

func TestSetTracking_TracksEquippedSetPieces(t *testing.T) {
	inv := NewInventory()
	helm := &Item{ID: "helm", Type: ItemTypeHead, SetName: "Fire Mage"}
	chest := &Item{ID: "chest", Type: ItemTypeChest, SetName: "Fire Mage"}

	inv.EquipItem(helm)
	assert.Equal(t, 1, inv.GetSetBonusCount("Fire Mage"))

	inv.EquipItem(chest)
	assert.Equal(t, 2, inv.GetSetBonusCount("Fire Mage"))
}

func TestSetTracking_DecrementsOnUnequip(t *testing.T) {
	inv := NewInventory()
	helm := &Item{ID: "helm", Type: ItemTypeHead, SetName: "Fire Mage"}
	chest := &Item{ID: "chest", Type: ItemTypeChest, SetName: "Fire Mage"}

	inv.EquipItem(helm)
	inv.EquipItem(chest)
	assert.Equal(t, 2, inv.GetSetBonusCount("Fire Mage"))

	inv.UnequipItem(SlotHead)
	assert.Equal(t, 1, inv.GetSetBonusCount("Fire Mage"))

	inv.UnequipItem(SlotChest)
	assert.Equal(t, 0, inv.GetSetBonusCount("Fire Mage"))
}

func TestSetTracking_HandlesReplacement(t *testing.T) {
	inv := NewInventory()
	oldHelm := &Item{ID: "old-helm", Type: ItemTypeHead, SetName: "Fire Mage"}
	newHelm := &Item{ID: "new-helm", Type: ItemTypeHead, SetName: "Ice Set"}

	inv.EquipItem(oldHelm)
	assert.Equal(t, 1, inv.GetSetBonusCount("Fire Mage"))
	assert.Equal(t, 0, inv.GetSetBonusCount("Ice Set"))

	inv.EquipItem(newHelm)
	assert.Equal(t, 0, inv.GetSetBonusCount("Fire Mage"))
	assert.Equal(t, 1, inv.GetSetBonusCount("Ice Set"))
}

func TestSetTracking_IgnoresNonSetItems(t *testing.T) {
	inv := NewInventory()
	helm := &Item{ID: "helm", Type: ItemTypeHead, SetName: ""} // No set

	inv.EquipItem(helm)
	assert.Equal(t, 0, inv.GetSetBonusCount(""))
}

// === Stat Aggregation Tests ===

func TestGetAllStats_EmptyInventory(t *testing.T) {
	inv := NewInventory()
	stats := inv.GetAllStats()

	assert.Empty(t, stats)
}

func TestGetAllStats_SingleItem(t *testing.T) {
	inv := NewInventory()
	helm := &Item{
		ID:   "helm",
		Type: ItemTypeHead,
		Affixes: []ItemAffix{
			{Stat: StatHealth, Value: 25.0},
			{Stat: StatArmor, Value: 10.0},
		},
	}
	inv.EquipItem(helm)

	stats := inv.GetAllStats()

	assert.Equal(t, 25.0, stats[StatHealth])
	assert.Equal(t, 10.0, stats[StatArmor])
}

func TestGetAllStats_MultipleItems(t *testing.T) {
	inv := NewInventory()
	helm := &Item{
		ID:   "helm",
		Type: ItemTypeHead,
		Affixes: []ItemAffix{
			{Stat: StatHealth, Value: 25.0},
		},
	}
	chest := &Item{
		ID:   "chest",
		Type: ItemTypeChest,
		Affixes: []ItemAffix{
			{Stat: StatHealth, Value: 50.0},
			{Stat: StatArmor, Value: 20.0},
		},
	}

	inv.EquipItem(helm)
	inv.EquipItem(chest)

	stats := inv.GetAllStats()

	assert.Equal(t, 75.0, stats[StatHealth]) // 25 + 50
	assert.Equal(t, 20.0, stats[StatArmor])
}

func TestGetAllStats_IncludesSetBonuses(t *testing.T) {
	inv := NewInventory()
	helm := &Item{ID: "helm", Type: ItemTypeHead, SetName: "Fire Mage", Affixes: []ItemAffix{}}
	chest := &Item{ID: "chest", Type: ItemTypeChest, SetName: "Fire Mage", Affixes: []ItemAffix{}}

	inv.EquipItem(helm)
	inv.EquipItem(chest)

	stats := inv.GetAllStats()

	// 2-piece set bonus should add +10 damage
	assert.Equal(t, 10.0, stats[StatDamage])
}

func TestGetAllStats_MultipleSetBonuses(t *testing.T) {
	inv := NewInventory()
	// 4 set pieces for 2-piece and 4-piece bonus
	helm := &Item{ID: "helm", Type: ItemTypeHead, SetName: "Fire Mage", Affixes: []ItemAffix{}}
	chest := &Item{ID: "chest", Type: ItemTypeChest, SetName: "Fire Mage", Affixes: []ItemAffix{}}
	hands := &Item{ID: "hands", Type: ItemTypeHands, SetName: "Fire Mage", Affixes: []ItemAffix{}}
	feet := &Item{ID: "feet", Type: ItemTypeFeet, SetName: "Fire Mage", Affixes: []ItemAffix{}}

	inv.EquipItem(helm)
	inv.EquipItem(chest)
	inv.EquipItem(hands)
	inv.EquipItem(feet)

	stats := inv.GetAllStats()

	// 2-piece: +10 damage, 4-piece: +50 health
	assert.Equal(t, 10.0, stats[StatDamage])
	assert.Equal(t, 50.0, stats[StatHealth])
}

// === Serialization Tests ===

func TestInventorySerialize_EmptyInventory(t *testing.T) {
	inv := NewInventory()
	data := inv.Serialize()

	equipment := data["equipment"].(map[string]interface{})
	bags := data["bags"].([]interface{})
	setPieces := data["setPieces"].(map[string]int)

	assert.Len(t, equipment, 9)
	assert.Len(t, bags, 60)
	assert.Empty(t, setPieces)
}

func TestInventorySerialize_WithItems(t *testing.T) {
	inv := NewInventory()
	helm := &Item{ID: "helm", Name: "Test Helm", Type: ItemTypeHead, Affixes: []ItemAffix{}}
	inv.EquipItem(helm)
	inv.Bags[0] = &Item{ID: "bag-item", Name: "Bag Item", Type: ItemTypeRing, Affixes: []ItemAffix{}}

	data := inv.Serialize()

	equipment := data["equipment"].(map[string]interface{})
	bags := data["bags"].([]interface{})

	// Check equipped item
	headData := equipment["head"].(map[string]interface{})
	assert.Equal(t, "helm", headData["id"])

	// Check bag item
	bag0 := bags[0].(map[string]interface{})
	assert.Equal(t, "bag-item", bag0["id"])
}

func TestDeserializeInventory_RestoresEquipment(t *testing.T) {
	equippedData := map[string]interface{}{
		"head": map[string]interface{}{
			"id":      "helm-1",
			"name":    "Test Helm",
			"type":    "head",
			"rarity":  "rare",
			"level":   float64(10),
			"affixes": []interface{}{},
		},
	}
	bagsData := []interface{}{
		map[string]interface{}{
			"id":      "bag-item-1",
			"name":    "Bag Ring",
			"type":    "ring",
			"rarity":  "normal",
			"level":   float64(5),
			"affixes": []interface{}{},
		},
	}

	inv := DeserializeInventory(equippedData, bagsData)

	require.NotNil(t, inv)
	assert.NotNil(t, inv.Equipment[SlotHead])
	assert.Equal(t, "helm-1", inv.Equipment[SlotHead].ID)
	assert.NotNil(t, inv.Bags[0])
	assert.Equal(t, "bag-item-1", inv.Bags[0].ID)
}

func TestInventorySerializeDeserialize_RoundTrip(t *testing.T) {
	original := NewInventory()
	helm := &Item{ID: "helm", Name: "Test Helm", Type: ItemTypeHead, SetName: "Test Set", Affixes: []ItemAffix{{Stat: StatHealth, Value: 10}}}
	original.EquipItem(helm)
	original.Bags[5] = &Item{ID: "ring", Name: "Test Ring", Type: ItemTypeRing, Affixes: []ItemAffix{}}

	serialized := original.Serialize()

	// Extract equipment and bags data for deserialization
	equippedData := serialized["equipment"].(map[string]interface{})
	bagsData := serialized["bags"].([]interface{})

	restored := DeserializeInventory(equippedData, bagsData)

	require.NotNil(t, restored)
	assert.NotNil(t, restored.Equipment[SlotHead])
	assert.Equal(t, "helm", restored.Equipment[SlotHead].ID)
	assert.Equal(t, "Test Set", restored.Equipment[SlotHead].SetName)
	assert.Equal(t, 1, restored.GetSetBonusCount("Test Set"))
	assert.NotNil(t, restored.Bags[5])
	assert.Equal(t, "ring", restored.Bags[5].ID)
}

// === GetEquippedItem Tests ===

func TestGetEquippedItem_ReturnsItem(t *testing.T) {
	inv := NewInventory()
	helm := &Item{ID: "helm", Type: ItemTypeHead}
	inv.EquipItem(helm)

	result := inv.GetEquippedItem(SlotHead)

	assert.Equal(t, helm, result)
}

func TestGetEquippedItem_EmptySlot(t *testing.T) {
	inv := NewInventory()

	result := inv.GetEquippedItem(SlotHead)

	assert.Nil(t, result)
}
