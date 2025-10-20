import ItemAttribute from '#shared/config/item-attribute.js'
import ItemSet from '#shared/config/items/sets.js'

/**
 * Utility class for calculating stats from equipped items
 */
export default class InventoryStatCalculator {
  /**
   * Calculate total stats from equipped items including set bonuses
   * @param {Object} equippedItems - Object containing equipped items by slot
   * @returns {Object} Calculated stats object
   */
  static calculateStats(equippedItems) {
    const stats = {}
    const setCounts = {}
    
    // Apply attributes from individual items
    Object.values(equippedItems).forEach(item => {
      if (item != null) {
        // Add item attributes to stats
        Object.keys(item.attributes).forEach(stat => {
          const value = item.attributes[stat]
          if (stats[stat] == null) stats[stat] = 0
          stats[stat] += value
        })

        // Add abilities and modifiers to stats
        item.abilities.forEach(abilityId => {
          if (stats[abilityId] == null) stats[abilityId] = 0
          stats[abilityId] += 1
        })

        item.abilityModifiers.forEach(modifierId => {
          if (stats[modifierId] == null) stats[modifierId] = 0
          stats[modifierId] += 1
        })

        // Count set pieces
        if (item.setId) {
          setCounts[item.setId] = (setCounts[item.setId] || 0) + 1
        }
      }
    })

    // Apply set bonuses if there are enough pieces equipped
    if (Object.keys(setCounts).length) {
      Object.keys(setCounts).forEach(setId => {
        const setCount = setCounts[setId]
        this.getSetBonusTiers(setId, setCount).forEach(({ attributes, abilities, abilityModifiers, isEarned }) => {
          if (isEarned) {
            // Apply attribute bonuses
            Object.keys(attributes).forEach(stat => {
              if (stats[stat] == null) stats[stat] = 0
              stats[stat] += attributes[stat]
            })
            
            // Apply ability bonuses
            abilities.forEach(abilityId => {
              if (stats[abilityId] == null) stats[abilityId] = 0
              stats[abilityId] += 1
            })
            
            // Apply modifier bonuses
            abilityModifiers.forEach(modifierId => {
              if (stats[modifierId] == null) stats[modifierId] = 0
              stats[modifierId] += 1
            })
          }
        })
      })
    }
      
    // TODO: Apply stats for attack speed based on equipped weapons / 1h vs 2h etc
    // TODO: Apply entity base attributes (eg, from entity class, level, etc)
    // TODO: Apply temporary buffs/debuffs
    
    return stats
  }

  /**
   * Calculate set piece counts for equipped items
   * @param {Object} equippedItems - Object containing equipped items by slot
   * @returns {Object} Set counts by setId
   */
  static calculateSetCounts(equippedItems) {
    const setCounts = {}
    
    Object.values(equippedItems).forEach(item => {
      if (item != null && item.setId) {
        setCounts[item.setId] = (setCounts[item.setId] || 0) + 1
      }
    })
    
    return setCounts
  }

  /**
   * Get earned set bonus tiers for a specific set
   * @param {string} setId - The set identifier
   * @param {number} equippedCount - Number of set pieces equipped
   * @returns {Array} Array of objects with {itemCount, bonusTier, isEarned}
   */
  static getSetBonusTiers(setId, equippedCount) {
    const set = ItemSet[setId]
    if (!set || !set.bonuses) {
      return []
    }

    const tiers = []
    
    // Iterate through all bonus tiers (bonuses[0] = 1 item, bonuses[1] = 2 items, etc.)
    for (let arrayIndex = 0; arrayIndex < set.bonuses.length; arrayIndex++) {
      const bonusTier = set.bonuses[arrayIndex]
      const itemCount = arrayIndex + 1  // 1 item, 2 items, 3 items, etc.
      const isEarned = equippedCount >= itemCount
      
      // Extract the three bonus types
      const attributes = bonusTier.attributes || {}
      const abilities = bonusTier.abilities || []
      const abilityModifiers = bonusTier.abilityModifiers || []
      
      // Only include tiers that have bonuses (skip completely empty tiers)
      const hasAttributes = Object.keys(attributes).length > 0
      const hasAbilities = abilities.length > 0
      const hasModifiers = abilityModifiers.length > 0
      
      if (hasAttributes || hasAbilities || hasModifiers) {
        tiers.push({
          itemCount,
          attributes,
          abilities,
          abilityModifiers,
          isEarned
        })
      }
    }
    
    return tiers
  }
}