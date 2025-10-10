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
  }

  serialize() {
    return {
      ...super.serialize(),
      playerId: this.playerId,
      socketId: this.socketId,
      username: this.username,
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
