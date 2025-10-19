import LivingEntityState from './living-entity-state.js'

export default class PlayerState extends LivingEntityState {
  constructor({
    playerId,
    socketId,
    username,
    color,
    targetItem,
    inventory,
    pather,
    x = 0,
    y = 0,
    actionBarConfig = null,
  }) {
    super({
      id: playerId,
      label: username,
      pather,
      x,
      y,
      color,
      targetItem,
      inventory,
    })

    this.playerId = playerId
    this.socketId = socketId
    this.username = username
    this.actionBarConfig = actionBarConfig || Array(6).fill(null).map(() => ({
      abilityId: null,
      modifiers: []
    }))
    this.abilityCooldowns = {} // Track cooldowns by abilityId -> timestamp when cooldown expires
    this.turretCounts = {} // Track active turret counts by abilityId
  }

  serialize() {
    return {
      ...super.serialize(),
      playerId: this.playerId,
      socketId: this.socketId,
      username: this.username,
      actionBarConfig: this.actionBarConfig,
      abilityCooldowns: this.abilityCooldowns,
      turretCounts: this.turretCounts,
    }
  }

  deserialize(data) {
    super.deserialize(data)
    // Ensure actionBarConfig is properly initialized if missing from saved data
    if (!this.actionBarConfig) {
      this.setActionBarConfig(data.actionBarConfig)
    }
    // Ensure abilityCooldowns is properly initialized
    if (data.abilityCooldowns) {
      this.abilityCooldowns = data.abilityCooldowns
    } else if (!this.abilityCooldowns) {
      this.abilityCooldowns = {}
    }
    // Ensure turretCounts is properly initialized
    if (data.turretCounts) {
      this.turretCounts = data.turretCounts
    } else if (!this.turretCounts) {
      this.turretCounts = {}
    }
  }

  setActionBarConfig(config) {
    if (Array.isArray(config) && config.length === 6) {
      this.actionBarConfig = config
    }
  }

  setTarget(target) {
    // set target
    super.setTarget(target)

    // if new target is too far from player.targetItem, clear targetItem
    // TODO: play with this.. might need tuning
    // if (this.targetItem != null) {
    //   const distance = Math.hypot(
    //     this.targetItem.position.x - this.x,
    //     this.targetItem.position.y - this.y
    //   )
    //   if (distance > BLOCK_SIZE * 2) {
    //     console.log('target set too far from targetItem, clearing targetItem')
    //     this.targetItem = null
    //   }
    // }
  }

  isAbilityOnCooldown(abilityId) {
    const now = Date.now()
    const cooldownExpiry = this.abilityCooldowns[abilityId]
    return cooldownExpiry && cooldownExpiry > now
  }

  getAbilityCooldownRemaining(abilityId) {
    const now = Date.now()
    const cooldownExpiry = this.abilityCooldowns[abilityId]
    if (!cooldownExpiry || cooldownExpiry <= now) {
      return 0
    }
    return cooldownExpiry - now
  }

  setAbilityCooldown(abilityId, cooldownMS) {
    this.abilityCooldowns[abilityId] = Date.now() + cooldownMS
  }

  updateTurretCount(abilityId, count) {
    this.turretCounts[abilityId] = count
  }

  getTurretCount(abilityId) {
    return this.turretCounts[abilityId] || 0
  }

  hasAbilityUnlocked(abilityId) {
    // For now, all abilities are unlocked
    // This can be expanded later with a proper unlock system
    return true
  }
}
