import EntityState from './entity-state.js'

export default class PlayerState extends EntityState {
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
  }

  serialize() {
    return {
      ...super.serialize(),
      playerId: this.playerId,
      socketId: this.socketId,
      username: this.username,
      actionBarConfig: this.actionBarConfig,
    }
  }

  deserialize(data) {
    super.deserialize(data)
    // Ensure actionBarConfig is properly initialized if missing from saved data
    if (!this.actionBarConfig) {
      this.setActionBarConfig(data.actionBarConfig)
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
}
