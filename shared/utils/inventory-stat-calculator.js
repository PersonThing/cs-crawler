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
          if (stats[stat] == null) stats[stat] = 0
          stats[stat] += item.attributes[stat]
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
        this.getSetBonusTiers(setId, setCount).forEach(({ attributes, isEarned }) => {
          if (isEarned) {
            Object.keys(attributes).forEach(stat => {
              if (stats[stat] == null) stats[stat] = 0
              stats[stat] += attributes[stat]
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
      const attributes = set.bonuses[arrayIndex]
      const itemCount = arrayIndex + 1  // 1 item, 2 items, 3 items, etc.
      const isEarned = equippedCount >= itemCount
      
      // Only include tiers that have bonuses (skip empty objects)
      if (attributes && Object.keys(attributes).length > 0) {
        tiers.push({
          itemCount,
          attributes,
          isEarned
        })
      }
    }
    
    return tiers
  }
}