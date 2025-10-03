import createStore from './create-store.js'

class EntityStats {
  constructor(entity) {
    this.entity = entity

    // default stats
    this.store = createStore({})

    // when inventory equipped changes, update stats
    this.entity.inventory.store.subscribe(inventory => {
      this.calculateStats(inventory?.equipped ?? [])
    })
  }

  calculateStats(equipped) {
    const stats = {}

    // apply attributes from items
    Object.keys(equipped).forEach(itemKey => {
      const item = equipped[itemKey]
      if (item) {
        Object.keys(item.attributes).forEach(stat => {
          if (stats[stat] == null) stats[stat] = 0
          stats[stat] += item.attributes[stat]
        })
      }
    })

    // todo: apply stats for attack speed based on equipped weapons / 1h vs 2h etc

    // todo: apply entity base attributes (eg, from entity class, level, etc)

    // todo: apply temporary buffs/debuffs

    console.log('calculated stats', stats)
    this.store.set(stats)
  }

  getStat(statName) {
    return this.store.get()[statName] || 0
  }
}

export default EntityStats
