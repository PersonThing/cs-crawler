package game

import (
	"errors"
)

// EquipmentSlot represents a slot where items can be equipped
type EquipmentSlot string

const (
	SlotHead      EquipmentSlot = "head"
	SlotChest     EquipmentSlot = "chest"
	SlotHands     EquipmentSlot = "hands"
	SlotFeet      EquipmentSlot = "feet"
	SlotWeapon1   EquipmentSlot = "weapon1"
	SlotWeapon2   EquipmentSlot = "weapon2"
	SlotAmulet    EquipmentSlot = "amulet"
	SlotRing1     EquipmentSlot = "ring1"
	SlotRing2     EquipmentSlot = "ring2"
)

// Inventory manages player items
type Inventory struct {
	// Equipped items
	Equipment map[EquipmentSlot]*Item

	// Bag storage (60 slots)
	Bags      []*Item
	MaxBagSlots int

	// Set bonuses tracking
	SetPieces map[string]int // setName -> count
}

// NewInventory creates a new empty inventory
func NewInventory() *Inventory {
	return &Inventory{
		Equipment: map[EquipmentSlot]*Item{
			SlotHead:    nil,
			SlotChest:   nil,
			SlotHands:   nil,
			SlotFeet:    nil,
			SlotWeapon1: nil,
			SlotWeapon2: nil,
			SlotAmulet:  nil,
			SlotRing1:   nil,
			SlotRing2:   nil,
		},
		Bags:        make([]*Item, 60),
		MaxBagSlots: 60,
		SetPieces:   make(map[string]int),
	}
}

// EquipItem equips an item to the appropriate slot
func (inv *Inventory) EquipItem(item *Item) (*Item, error) {
	if item == nil {
		return nil, errors.New("cannot equip nil item")
	}

	// Determine which slot to equip to
	slot, err := inv.getEquipmentSlot(item)
	if err != nil {
		return nil, err
	}

	// Check for 2-handed weapon restrictions
	if item.Type == ItemTypeWeapon2H {
		// Unequip both weapon slots
		unequipped1 := inv.Equipment[SlotWeapon1]
		unequipped2 := inv.Equipment[SlotWeapon2]
		inv.Equipment[SlotWeapon1] = item
		inv.Equipment[SlotWeapon2] = nil

		// Update set tracking
		inv.updateSetTracking(item, true)
		if unequipped1 != nil {
			inv.updateSetTracking(unequipped1, false)
		}
		if unequipped2 != nil {
			inv.updateSetTracking(unequipped2, false)
		}

		// Return the main hand item if any (other hand must be empty for 2H)
		return unequipped1, nil
	}

	// For 1-handed weapons, check if there's a 2-handed weapon equipped
	if item.Type == ItemTypeWeapon1H {
		equipped1 := inv.Equipment[SlotWeapon1]
		equipped2 := inv.Equipment[SlotWeapon2]

		// If slot 1 has a 2H weapon, unequip it
		if equipped1 != nil && equipped1.Type == ItemTypeWeapon2H {
			inv.Equipment[SlotWeapon1] = item
			inv.Equipment[SlotWeapon2] = nil
			inv.updateSetTracking(equipped1, false)
			inv.updateSetTracking(item, true)
			return equipped1, nil
		}

		// Prefer weapon1 slot, unless it's occupied and weapon2 is free
		if slot == SlotWeapon1 && equipped1 != nil && equipped2 == nil {
			slot = SlotWeapon2
		}
	}

	// For rings, prefer ring1 slot unless it's occupied
	if item.Type == ItemTypeRing && slot == SlotRing1 {
		if inv.Equipment[SlotRing1] != nil && inv.Equipment[SlotRing2] == nil {
			slot = SlotRing2
		}
	}

	// Unequip current item in slot
	unequipped := inv.Equipment[slot]
	inv.Equipment[slot] = item

	// Update set tracking
	inv.updateSetTracking(item, true)
	if unequipped != nil {
		inv.updateSetTracking(unequipped, false)
	}

	return unequipped, nil
}

// UnequipItem removes an item from an equipment slot
func (inv *Inventory) UnequipItem(slot EquipmentSlot) (*Item, error) {
	item := inv.Equipment[slot]
	if item == nil {
		return nil, errors.New("no item equipped in slot")
	}

	inv.Equipment[slot] = nil

	// If unequipping a 2H weapon from weapon1, also clear weapon2
	if slot == SlotWeapon1 && item.Type == ItemTypeWeapon2H {
		inv.Equipment[SlotWeapon2] = nil
	}

	// Update set tracking
	inv.updateSetTracking(item, false)

	return item, nil
}

// AddToBag adds an item to the first available bag slot
func (inv *Inventory) AddToBag(item *Item) (int, error) {
	if item == nil {
		return -1, errors.New("cannot add nil item to bag")
	}

	for i := 0; i < inv.MaxBagSlots; i++ {
		if inv.Bags[i] == nil {
			inv.Bags[i] = item
			return i, nil
		}
	}

	return -1, errors.New("bag is full")
}

// RemoveFromBag removes an item from a specific bag slot
func (inv *Inventory) RemoveFromBag(slot int) (*Item, error) {
	if slot < 0 || slot >= inv.MaxBagSlots {
		return nil, errors.New("invalid bag slot")
	}

	item := inv.Bags[slot]
	if item == nil {
		return nil, errors.New("no item in bag slot")
	}

	inv.Bags[slot] = nil
	return item, nil
}

// GetBagItem returns the item in a specific bag slot
func (inv *Inventory) GetBagItem(slot int) *Item {
	if slot < 0 || slot >= inv.MaxBagSlots {
		return nil
	}
	return inv.Bags[slot]
}

// GetEquippedItem returns the item in a specific equipment slot
func (inv *Inventory) GetEquippedItem(slot EquipmentSlot) *Item {
	return inv.Equipment[slot]
}

// getEquipmentSlot determines which slot an item should be equipped to
func (inv *Inventory) getEquipmentSlot(item *Item) (EquipmentSlot, error) {
	switch item.Type {
	case ItemTypeHead:
		return SlotHead, nil
	case ItemTypeChest:
		return SlotChest, nil
	case ItemTypeHands:
		return SlotHands, nil
	case ItemTypeFeet:
		return SlotFeet, nil
	case ItemTypeWeapon1H:
		return SlotWeapon1, nil
	case ItemTypeWeapon2H:
		return SlotWeapon1, nil
	case ItemTypeAmulet:
		return SlotAmulet, nil
	case ItemTypeRing:
		return SlotRing1, nil
	default:
		return "", errors.New("unknown item type")
	}
}

// updateSetTracking updates the set piece count
func (inv *Inventory) updateSetTracking(item *Item, equipped bool) {
	if item.SetName == "" {
		return
	}

	if equipped {
		inv.SetPieces[item.SetName]++
	} else {
		inv.SetPieces[item.SetName]--
		if inv.SetPieces[item.SetName] <= 0 {
			delete(inv.SetPieces, item.SetName)
		}
	}
}

// GetSetBonusCount returns the number of pieces equipped for a set
func (inv *Inventory) GetSetBonusCount(setName string) int {
	return inv.SetPieces[setName]
}

// GetAllStats calculates total stats from all equipped items
func (inv *Inventory) GetAllStats() map[StatType]float64 {
	stats := make(map[StatType]float64)

	// Sum stats from all equipped items
	for _, item := range inv.Equipment {
		if item == nil {
			continue
		}

		for _, affix := range item.Affixes {
			stats[affix.Stat] += affix.Value
		}
	}

	// Apply set bonuses
	for setName, count := range inv.SetPieces {
		setBonus := inv.getSetBonus(setName, count)
		for stat, value := range setBonus {
			stats[stat] += value
		}
	}

	return stats
}

// getSetBonus returns bonus stats for having multiple pieces of a set equipped
func (inv *Inventory) getSetBonus(setName string, count int) map[StatType]float64 {
	bonuses := make(map[StatType]float64)

	// Example set bonuses (can be configured later)
	// 2-piece: +10% damage
	if count >= 2 {
		bonuses[StatDamage] += 10
	}

	// 4-piece: +20% health
	if count >= 4 {
		bonuses[StatHealth] += 50
	}

	// 6-piece: +15% move speed
	if count >= 6 {
		bonuses[StatMoveSpeed] += 1.5
	}

	return bonuses
}

// SwapBagItems swaps two items in bag slots
func (inv *Inventory) SwapBagItems(from, to int) error {
	if from < 0 || from >= inv.MaxBagSlots || to < 0 || to >= inv.MaxBagSlots {
		return errors.New("invalid bag slot")
	}
	inv.Bags[from], inv.Bags[to] = inv.Bags[to], inv.Bags[from]
	return nil
}

// IsFull returns true if the bag has no empty slots
func (inv *Inventory) IsFull() bool {
	for i := 0; i < inv.MaxBagSlots; i++ {
		if inv.Bags[i] == nil {
			return false
		}
	}
	return true
}

// DeserializeInventory reconstructs an Inventory from JSON-friendly maps
func DeserializeInventory(equippedData map[string]interface{}, bagsData []interface{}) *Inventory {
	inv := NewInventory()

	// Restore equipment
	for slotName, itemData := range equippedData {
		if itemData == nil {
			continue
		}
		if itemMap, ok := itemData.(map[string]interface{}); ok {
			item := DeserializeItem(itemMap)
			if item != nil {
				slot := EquipmentSlot(slotName)
				inv.Equipment[slot] = item
				inv.updateSetTracking(item, true)
			}
		}
	}

	// Restore bag items
	for i, itemData := range bagsData {
		if i >= inv.MaxBagSlots {
			break
		}
		if itemData == nil {
			continue
		}
		if itemMap, ok := itemData.(map[string]interface{}); ok {
			item := DeserializeItem(itemMap)
			if item != nil {
				inv.Bags[i] = item
			}
		}
	}

	return inv
}

// Serialize converts inventory to JSON-friendly format
func (inv *Inventory) Serialize() map[string]interface{} {
	equipment := make(map[string]interface{})
	for slot, item := range inv.Equipment {
		if item != nil {
			equipment[string(slot)] = item.Serialize()
		} else {
			equipment[string(slot)] = nil
		}
	}

	bags := make([]interface{}, inv.MaxBagSlots)
	for i, item := range inv.Bags {
		if item != nil {
			bags[i] = item.Serialize()
		} else {
			bags[i] = nil
		}
	}

	setPieces := make(map[string]int)
	for setName, count := range inv.SetPieces {
		setPieces[setName] = count
	}

	return map[string]interface{}{
		"equipment": equipment,
		"bags":      bags,
		"setPieces": setPieces,
	}
}
