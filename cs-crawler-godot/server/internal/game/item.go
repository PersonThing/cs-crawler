package game

import (
	"fmt"
	"math/rand"
	"time"
)

// ItemType represents the type/slot of an item
type ItemType string

const (
	ItemTypeWeapon1H ItemType = "weapon_1h"
	ItemTypeWeapon2H ItemType = "weapon_2h"
	ItemTypeHead     ItemType = "head"
	ItemTypeChest    ItemType = "chest"
	ItemTypeHands    ItemType = "hands"
	ItemTypeFeet     ItemType = "feet"
	ItemTypeAmulet   ItemType = "amulet"
	ItemTypeRing     ItemType = "ring"
)

// ItemRarity represents the quality/rarity of an item
type ItemRarity string

const (
	ItemRarityNormal ItemRarity = "normal"
	ItemRarityRare   ItemRarity = "rare"
	ItemRarityUnique ItemRarity = "unique"
)

// StatType represents different stats that items can provide
type StatType string

const (
	StatHealth       StatType = "health"
	StatDamage       StatType = "damage"
	StatMoveSpeed    StatType = "move_speed"
	StatAttackSpeed  StatType = "attack_speed"
	StatCritChance   StatType = "crit_chance"
	StatCritDamage   StatType = "crit_damage"
	StatFireDamage   StatType = "fire_damage"
	StatColdDamage   StatType = "cold_damage"
	StatLightningDamage StatType = "lightning_damage"
	StatArmor        StatType = "armor"
	StatFireResist   StatType = "fire_resist"
	StatColdResist   StatType = "cold_resist"
	StatLightningResist StatType = "lightning_resist"
)

// ItemAffix represents a stat bonus on an item
type ItemAffix struct {
	Stat  StatType
	Value float64
	Min   float64
	Max   float64
}

// Item represents a piece of equipment
type Item struct {
	ID          string
	Name        string
	Type        ItemType
	Rarity      ItemRarity
	Level       int
	Affixes     []ItemAffix
	SetName     string // Empty if not part of a set
	Description string
}

// NewItem creates a new item with the given parameters
func NewItem(id string, itemType ItemType, level int) *Item {
	item := &Item{
		ID:      id,
		Type:    itemType,
		Level:   level,
		Affixes: make([]ItemAffix, 0),
	}

	// Determine rarity
	item.Rarity = rollRarity()

	// Generate name based on type and rarity
	item.Name = generateItemName(itemType, item.Rarity)

	// Generate affixes based on rarity
	item.generateAffixes()

	return item
}

// rollRarity determines the rarity of an item
func rollRarity() ItemRarity {
	roll := rand.Float64()

	// 60% normal, 35% rare, 5% unique
	if roll < 0.60 {
		return ItemRarityNormal
	} else if roll < 0.95 {
		return ItemRarityRare
	}
	return ItemRarityUnique
}

// generateItemName creates a name for the item
func generateItemName(itemType ItemType, rarity ItemRarity) string {
	prefixes := map[ItemRarity][]string{
		ItemRarityNormal: {"Simple", "Common", "Basic", "Standard"},
		ItemRarityRare:   {"Superior", "Fine", "Enchanted", "Blessed"},
		ItemRarityUnique: {"Legendary", "Epic", "Mythic", "Ancient"},
	}

	baseNames := map[ItemType][]string{
		ItemTypeWeapon1H: {"Sword", "Axe", "Mace", "Dagger"},
		ItemTypeWeapon2H: {"Greatsword", "Battleaxe", "Warhammer", "Staff"},
		ItemTypeHead:     {"Helm", "Hood", "Crown", "Cap"},
		ItemTypeChest:    {"Armor", "Robe", "Tunic", "Breastplate"},
		ItemTypeHands:    {"Gloves", "Gauntlets", "Mitts", "Wraps"},
		ItemTypeFeet:     {"Boots", "Shoes", "Greaves", "Treads"},
		ItemTypeAmulet:   {"Amulet", "Pendant", "Necklace", "Talisman"},
		ItemTypeRing:     {"Ring", "Band", "Circle", "Loop"},
	}

	prefix := prefixes[rarity][rand.Intn(len(prefixes[rarity]))]
	baseName := baseNames[itemType][rand.Intn(len(baseNames[itemType]))]

	return fmt.Sprintf("%s %s", prefix, baseName)
}

// generateAffixes creates random stat bonuses for the item
func (i *Item) generateAffixes() {
	// Number of affixes based on rarity
	numAffixes := 0
	switch i.Rarity {
	case ItemRarityNormal:
		numAffixes = 1 + rand.Intn(2) // 1-2 affixes
	case ItemRarityRare:
		numAffixes = 2 + rand.Intn(3) // 2-4 affixes
	case ItemRarityUnique:
		numAffixes = 4 + rand.Intn(3) // 4-6 affixes
	}

	// Available stats based on item type
	availableStats := i.getAvailableStats()

	// Shuffle and pick affixes
	rand.Shuffle(len(availableStats), func(i, j int) {
		availableStats[i], availableStats[j] = availableStats[j], availableStats[i]
	})

	for j := 0; j < numAffixes && j < len(availableStats); j++ {
		stat := availableStats[j]
		affix := i.generateAffix(stat)
		i.Affixes = append(i.Affixes, affix)
	}
}

// getAvailableStats returns the stats that can roll on this item type
func (i *Item) getAvailableStats() []StatType {
	stats := []StatType{StatHealth, StatMoveSpeed}

	switch i.Type {
	case ItemTypeWeapon1H, ItemTypeWeapon2H:
		stats = append(stats, StatDamage, StatAttackSpeed, StatCritChance, StatCritDamage)
		stats = append(stats, StatFireDamage, StatColdDamage, StatLightningDamage)
	case ItemTypeHead, ItemTypeChest, ItemTypeHands, ItemTypeFeet:
		stats = append(stats, StatArmor, StatFireResist, StatColdResist, StatLightningResist)
	case ItemTypeAmulet, ItemTypeRing:
		stats = append(stats, StatDamage, StatCritChance, StatCritDamage)
		stats = append(stats, StatFireDamage, StatColdDamage, StatLightningDamage)
		stats = append(stats, StatFireResist, StatColdResist, StatLightningResist)
	}

	return stats
}

// generateAffix creates a random affix for a given stat
func (i *Item) generateAffix(stat StatType) ItemAffix {
	// Base ranges for each stat (scaled by item level)
	ranges := map[StatType]struct{ min, max float64 }{
		StatHealth:          {10, 50},
		StatDamage:          {2, 10},
		StatMoveSpeed:       {0.5, 2.0},
		StatAttackSpeed:     {5, 15},
		StatCritChance:      {1, 5},
		StatCritDamage:      {10, 30},
		StatFireDamage:      {3, 15},
		StatColdDamage:      {3, 15},
		StatLightningDamage: {3, 15},
		StatArmor:           {5, 25},
		StatFireResist:      {3, 15},
		StatColdResist:      {3, 15},
		StatLightningResist: {3, 15},
	}

	baseRange := ranges[stat]

	// Scale by item level (level 1 = 50% of base, level 50 = 150% of base)
	levelScale := 0.5 + (float64(i.Level) / 50.0)

	min := baseRange.min * levelScale
	max := baseRange.max * levelScale

	// Rarity multiplier
	rarityMult := 1.0
	switch i.Rarity {
	case ItemRarityRare:
		rarityMult = 1.5
	case ItemRarityUnique:
		rarityMult = 2.0
	}

	min *= rarityMult
	max *= rarityMult

	// Roll random value in range
	value := min + rand.Float64()*(max-min)

	return ItemAffix{
		Stat:  stat,
		Value: value,
		Min:   min,
	Max:   max,
	}
}

// GetStat returns the total value of a specific stat from all affixes
func (i *Item) GetStat(stat StatType) float64 {
	total := 0.0
	for _, affix := range i.Affixes {
		if affix.Stat == stat {
			total += affix.Value
		}
	}
	return total
}

// Serialize converts item to JSON-friendly format
func (i *Item) Serialize() map[string]interface{} {
	affixes := make([]map[string]interface{}, 0, len(i.Affixes))
	for _, affix := range i.Affixes {
		affixes = append(affixes, map[string]interface{}{
			"stat":  affix.Stat,
			"value": affix.Value,
			"min":   affix.Min,
			"max":   affix.Max,
		})
	}

	return map[string]interface{}{
		"id":          i.ID,
		"name":        i.Name,
		"type":        i.Type,
		"rarity":      i.Rarity,
		"level":       i.Level,
		"affixes":     affixes,
		"setName":     i.SetName,
		"description": i.Description,
	}
}

// DeserializeItem reconstructs an Item from a JSON-friendly map
func DeserializeItem(data map[string]interface{}) *Item {
	if data == nil {
		return nil
	}

	item := &Item{}

	if v, ok := data["id"].(string); ok {
		item.ID = v
	}
	if v, ok := data["name"].(string); ok {
		item.Name = v
	}
	if v, ok := data["type"].(string); ok {
		item.Type = ItemType(v)
	}
	if v, ok := data["rarity"].(string); ok {
		item.Rarity = ItemRarity(v)
	}
	if v, ok := data["level"].(float64); ok {
		item.Level = int(v)
	}
	if v, ok := data["setName"].(string); ok {
		item.SetName = v
	}
	if v, ok := data["description"].(string); ok {
		item.Description = v
	}

	item.Affixes = make([]ItemAffix, 0)
	if affixesRaw, ok := data["affixes"].([]interface{}); ok {
		for _, a := range affixesRaw {
			if affixMap, ok := a.(map[string]interface{}); ok {
				affix := ItemAffix{}
				if v, ok := affixMap["stat"].(string); ok {
					affix.Stat = StatType(v)
				}
				if v, ok := affixMap["value"].(float64); ok {
					affix.Value = v
				}
				if v, ok := affixMap["min"].(float64); ok {
					affix.Min = v
				}
				if v, ok := affixMap["max"].(float64); ok {
					affix.Max = v
				}
				item.Affixes = append(item.Affixes, affix)
			}
		}
	}

	return item
}

// GroundItem represents an item dropped on the ground
type GroundItem struct {
	ID       string
	Item     *Item
	Position Vector3
	DroppedAt time.Time
}

// NewGroundItem creates a new ground item
func NewGroundItem(id string, item *Item, position Vector3) *GroundItem {
	return &GroundItem{
		ID:        id,
		Item:      item,
		Position:  position,
		DroppedAt: time.Now(),
	}
}

// Serialize converts ground item to JSON-friendly format
func (g *GroundItem) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"id":       g.ID,
		"item":     g.Item.Serialize(),
		"position": g.Position,
	}
}
