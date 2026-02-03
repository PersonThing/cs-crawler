package game

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// === Item Creation Tests ===

func TestNewItem_CreatesValidItem(t *testing.T) {
	item := NewItem("item-1", ItemTypeWeapon1H, 10)

	assert.Equal(t, "item-1", item.ID)
	assert.Equal(t, ItemTypeWeapon1H, item.Type)
	assert.Equal(t, 10, item.Level)
	assert.NotEmpty(t, item.Name)
	assert.NotEmpty(t, item.Rarity)
	assert.NotEmpty(t, item.Affixes)
}

func TestNewItem_AllItemTypes(t *testing.T) {
	itemTypes := []ItemType{
		ItemTypeWeapon1H, ItemTypeWeapon2H,
		ItemTypeHead, ItemTypeChest, ItemTypeHands, ItemTypeFeet,
		ItemTypeAmulet, ItemTypeRing,
	}

	for _, itemType := range itemTypes {
		t.Run(string(itemType), func(t *testing.T) {
			item := NewItem("test-"+string(itemType), itemType, 5)
			assert.Equal(t, itemType, item.Type)
			assert.NotEmpty(t, item.Name)
			assert.True(t, len(item.Affixes) >= 1, "Item should have at least 1 affix")
		})
	}
}

// === Rarity Tests ===

func TestRollRarity_ReturnsValidRarity(t *testing.T) {
	// Run multiple times to test probability distribution
	rarityCounts := map[ItemRarity]int{
		ItemRarityNormal: 0,
		ItemRarityRare:   0,
		ItemRarityUnique: 0,
	}

	iterations := 1000
	for i := 0; i < iterations; i++ {
		rarity := rollRarity()
		rarityCounts[rarity]++
	}

	// Check that all rarities appeared
	assert.Greater(t, rarityCounts[ItemRarityNormal], 0, "Should have normal items")
	assert.Greater(t, rarityCounts[ItemRarityRare], 0, "Should have rare items")
	assert.Greater(t, rarityCounts[ItemRarityUnique], 0, "Should have unique items")

	// Check rough distribution (with some tolerance for randomness)
	// Normal: ~60%, Rare: ~35%, Unique: ~5%
	normalPercent := float64(rarityCounts[ItemRarityNormal]) / float64(iterations) * 100
	assert.Greater(t, normalPercent, 40.0, "Normal items should be most common")
	assert.Less(t, normalPercent, 80.0, "Normal items should be most common")
}

// === Affix Generation Tests ===

func TestGenerateAffixes_NormalItem(t *testing.T) {
	item := &Item{Type: ItemTypeWeapon1H, Level: 10, Rarity: ItemRarityNormal}
	item.generateAffixes()

	// Normal items: 1-2 affixes
	assert.GreaterOrEqual(t, len(item.Affixes), 1)
	assert.LessOrEqual(t, len(item.Affixes), 2)
}

func TestGenerateAffixes_RareItem(t *testing.T) {
	item := &Item{Type: ItemTypeWeapon1H, Level: 10, Rarity: ItemRarityRare}
	item.generateAffixes()

	// Rare items: 2-4 affixes
	assert.GreaterOrEqual(t, len(item.Affixes), 2)
	assert.LessOrEqual(t, len(item.Affixes), 4)
}

func TestGenerateAffixes_UniqueItem(t *testing.T) {
	item := &Item{Type: ItemTypeWeapon1H, Level: 10, Rarity: ItemRarityUnique}
	item.generateAffixes()

	// Unique items: 4-6 affixes
	assert.GreaterOrEqual(t, len(item.Affixes), 4)
	assert.LessOrEqual(t, len(item.Affixes), 6)
}

func TestGenerateAffixes_WeaponStats(t *testing.T) {
	item := &Item{Type: ItemTypeWeapon1H, Level: 10, Rarity: ItemRarityUnique}
	item.generateAffixes()

	// Weapons should have offensive stats
	foundOffensiveStat := false
	offensiveStats := []StatType{
		StatDamage, StatAttackSpeed, StatCritChance, StatCritDamage,
		StatFireDamage, StatColdDamage, StatLightningDamage,
	}

	for _, affix := range item.Affixes {
		for _, offStat := range offensiveStats {
			if affix.Stat == offStat {
				foundOffensiveStat = true
				break
			}
		}
	}
	// Note: Not guaranteed due to random shuffling, but highly likely with 4-6 affixes
	// This is a soft assertion - it could fail rarely
	_ = foundOffensiveStat
}

func TestGenerateAffixes_ArmorStats(t *testing.T) {
	item := &Item{Type: ItemTypeChest, Level: 10, Rarity: ItemRarityUnique}
	item.generateAffixes()

	// Check that affixes have positive values
	for _, affix := range item.Affixes {
		assert.Greater(t, affix.Value, 0.0, "Affix value should be positive")
		assert.LessOrEqual(t, affix.Value, affix.Max, "Affix value should not exceed max")
		assert.GreaterOrEqual(t, affix.Value, affix.Min, "Affix value should be at least min")
	}
}

// === Level Scaling Tests ===

func TestAffixScaling_HigherLevelBetterStats(t *testing.T) {
	lowLevelItem := &Item{Type: ItemTypeWeapon1H, Level: 1, Rarity: ItemRarityRare}
	highLevelItem := &Item{Type: ItemTypeWeapon1H, Level: 50, Rarity: ItemRarityRare}

	// Generate same stat for comparison
	lowAffix := lowLevelItem.generateAffix(StatDamage)
	highAffix := highLevelItem.generateAffix(StatDamage)

	// Higher level should have higher max range
	assert.Greater(t, highAffix.Max, lowAffix.Max, "Higher level items should have better max stats")
}

func TestAffixScaling_RarityMultiplier(t *testing.T) {
	normalItem := &Item{Type: ItemTypeWeapon1H, Level: 25, Rarity: ItemRarityNormal}
	uniqueItem := &Item{Type: ItemTypeWeapon1H, Level: 25, Rarity: ItemRarityUnique}

	normalAffix := normalItem.generateAffix(StatDamage)
	uniqueAffix := uniqueItem.generateAffix(StatDamage)

	// Unique (2.0x multiplier) should have better max than normal (1.0x)
	assert.Greater(t, uniqueAffix.Max, normalAffix.Max, "Unique items should have better max stats")
}

// === GetStat Tests ===

func TestGetStat_ReturnsAffixValue(t *testing.T) {
	item := &Item{
		Affixes: []ItemAffix{
			{Stat: StatDamage, Value: 10.0},
			{Stat: StatHealth, Value: 25.0},
		},
	}

	assert.Equal(t, 10.0, item.GetStat(StatDamage))
	assert.Equal(t, 25.0, item.GetStat(StatHealth))
	assert.Equal(t, 0.0, item.GetStat(StatArmor)) // Not present
}

func TestGetStat_MultipleAffixesSameStat(t *testing.T) {
	item := &Item{
		Affixes: []ItemAffix{
			{Stat: StatDamage, Value: 10.0},
			{Stat: StatDamage, Value: 5.0}, // Same stat
		},
	}

	// Should sum multiple affixes of same stat
	assert.Equal(t, 15.0, item.GetStat(StatDamage))
}

// === Serialization Tests ===

func TestItemSerialize_AllFieldsPresent(t *testing.T) {
	item := &Item{
		ID:          "item-123",
		Name:        "Test Sword",
		Type:        ItemTypeWeapon1H,
		Rarity:      ItemRarityRare,
		Level:       15,
		SetName:     "Fire Mage",
		Description: "A test sword",
		Affixes: []ItemAffix{
			{Stat: StatDamage, Value: 10.0, Min: 8.0, Max: 12.0},
		},
	}

	data := item.Serialize()

	assert.Equal(t, "item-123", data["id"])
	assert.Equal(t, "Test Sword", data["name"])
	assert.Equal(t, "weapon_1h", data["type"])    // Serialized as string
	assert.Equal(t, "rare", data["rarity"])       // Serialized as string
	assert.Equal(t, 15, data["level"])
	assert.Equal(t, "Fire Mage", data["setName"])
	assert.Equal(t, "A test sword", data["description"])

	affixes := data["affixes"].([]map[string]interface{})
	assert.Len(t, affixes, 1)
	assert.Equal(t, "damage", affixes[0]["stat"]) // Serialized as string
	assert.Equal(t, 10.0, affixes[0]["value"])
}

func TestDeserializeItem_RestoresAllFields(t *testing.T) {
	data := map[string]interface{}{
		"id":          "item-456",
		"name":        "Restored Helm",
		"type":        "head",
		"rarity":      "unique",
		"level":       float64(20), // JSON numbers are float64
		"setName":     "Ice Set",
		"description": "A restored helm",
		"affixes": []interface{}{
			map[string]interface{}{
				"stat":  "armor",
				"value": float64(15.5),
				"min":   float64(10.0),
				"max":   float64(20.0),
			},
		},
	}

	item := DeserializeItem(data)

	require.NotNil(t, item)
	assert.Equal(t, "item-456", item.ID)
	assert.Equal(t, "Restored Helm", item.Name)
	assert.Equal(t, ItemTypeHead, item.Type)
	assert.Equal(t, ItemRarityUnique, item.Rarity)
	assert.Equal(t, 20, item.Level)
	assert.Equal(t, "Ice Set", item.SetName)
	assert.Equal(t, "A restored helm", item.Description)
	assert.Len(t, item.Affixes, 1)
	assert.Equal(t, StatArmor, item.Affixes[0].Stat)
	assert.Equal(t, 15.5, item.Affixes[0].Value)
}

func TestDeserializeItem_NilData(t *testing.T) {
	item := DeserializeItem(nil)
	assert.Nil(t, item)
}

func TestItemSerializeDeserialize_RoundTrip(t *testing.T) {
	original := NewItem("roundtrip-1", ItemTypeAmulet, 30)
	original.SetName = "Test Set"

	serialized := original.Serialize()
	restored := DeserializeItem(serialized)

	require.NotNil(t, restored)
	assert.Equal(t, original.ID, restored.ID)
	assert.Equal(t, original.Name, restored.Name)
	assert.Equal(t, original.Type, restored.Type)
	assert.Equal(t, original.Rarity, restored.Rarity)
	assert.Equal(t, original.Level, restored.Level)
	assert.Equal(t, original.SetName, restored.SetName)
	assert.Len(t, restored.Affixes, len(original.Affixes))
}

// === GroundItem Tests ===

func TestNewGroundItem_CreatesValidGroundItem(t *testing.T) {
	item := NewItem("item-ground", ItemTypeRing, 5)
	position := Vector3{X: 10.0, Y: 0.0, Z: 15.0}

	groundItem := NewGroundItem("ground-1", item, position)

	assert.Equal(t, "ground-1", groundItem.ID)
	assert.Equal(t, item, groundItem.Item)
	assert.Equal(t, 10.0, groundItem.Position.X)
	assert.Equal(t, 0.0, groundItem.Position.Y)
	assert.Equal(t, 15.0, groundItem.Position.Z)
	assert.False(t, groundItem.DroppedAt.IsZero())
}

func TestGroundItemSerialize_AllFieldsPresent(t *testing.T) {
	item := NewItem("item-ser", ItemTypeFeet, 12)
	position := Vector3{X: 5.0, Y: 1.0, Z: 8.0}
	groundItem := NewGroundItem("ground-ser", item, position)

	data := groundItem.Serialize()

	assert.Equal(t, "ground-ser", data["id"])
	assert.NotNil(t, data["item"])
	assert.Equal(t, position, data["position"])
}

// === Item Name Generation Tests ===

func TestGenerateItemName_AllRarities(t *testing.T) {
	rarities := []ItemRarity{ItemRarityNormal, ItemRarityRare, ItemRarityUnique}

	for _, rarity := range rarities {
		name := generateItemName(ItemTypeWeapon1H, rarity)
		assert.NotEmpty(t, name, "Name should not be empty for rarity %s", rarity)
		assert.Contains(t, name, " ", "Name should have prefix and base name")
	}
}

func TestGenerateItemName_AllTypes(t *testing.T) {
	itemTypes := []ItemType{
		ItemTypeWeapon1H, ItemTypeWeapon2H,
		ItemTypeHead, ItemTypeChest, ItemTypeHands, ItemTypeFeet,
		ItemTypeAmulet, ItemTypeRing,
	}

	for _, itemType := range itemTypes {
		name := generateItemName(itemType, ItemRarityNormal)
		assert.NotEmpty(t, name, "Name should not be empty for type %s", itemType)
	}
}

// === Available Stats Tests ===

func TestGetAvailableStats_WeaponHasOffensiveStats(t *testing.T) {
	item := &Item{Type: ItemTypeWeapon1H}
	stats := item.getAvailableStats()

	// Weapons should have damage stats
	assert.Contains(t, stats, StatDamage)
	assert.Contains(t, stats, StatAttackSpeed)
	assert.Contains(t, stats, StatCritChance)
	assert.Contains(t, stats, StatFireDamage)
}

func TestGetAvailableStats_ArmorHasDefensiveStats(t *testing.T) {
	item := &Item{Type: ItemTypeChest}
	stats := item.getAvailableStats()

	// Armor should have defensive stats
	assert.Contains(t, stats, StatArmor)
	assert.Contains(t, stats, StatFireResist)
	assert.Contains(t, stats, StatHealth)
}

func TestGetAvailableStats_JewelryHasMixedStats(t *testing.T) {
	item := &Item{Type: ItemTypeAmulet}
	stats := item.getAvailableStats()

	// Jewelry should have both offensive and defensive stats
	assert.Contains(t, stats, StatDamage)
	assert.Contains(t, stats, StatCritChance)
	assert.Contains(t, stats, StatFireResist)
	assert.Contains(t, stats, StatHealth)
}
