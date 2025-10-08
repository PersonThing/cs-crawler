import LivingEntityState from './living-entity-state.js'
import PlayerInventory from './player-inventory.js'
import { BLOCK_SIZE } from '../config/constants.js'

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
    })

    this.playerId = playerId
    this.socketId = socketId
    this.username = username
    this.color = color
    this.isLocalPlayer = false
    this.targetItem = targetItem

    this.inventory = new PlayerInventory(playerId, inventory)
  }

  onTick(deltaMs, groundItems) {
    super.onTick(deltaMs)

    // is player attempting to pick up item?
    if (this.targetItem != null) {
      // is item still on the ground?
      const groundItemIndex = groundItems.findIndex(gi => gi.item.id === this.targetItem.item.id)
      if (groundItemIndex === -1) {
        console.log('target item no longer exists on ground, clearing targetItem')
        this.targetItem = null
      } else {
        const groundItem = groundItems[groundItemIndex]
        if (groundItem == null) {
          console.log('target item no longer exists on ground, clearing targetItem')
          this.targetItem = null
        } else {
          // is it close enough to pick up yet?
          const distance = Math.hypot(
            this.targetItem.position.x - this.x,
            this.targetItem.position.y - this.y
          )
          if (distance <= BLOCK_SIZE * 2 && this.inventory.pickup(groundItem.item)) {
            // successfully picked up
            groundItems.splice(groundItemIndex, 1)
            this.targetItem = null
            console.log('picked up item', groundItem.item.name)
          }
        }
      }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      playerId: this.playerId,
      socketId: this.socketId,
      username: this.username,
      color: this.color,
      isLocalPlayer: this.isLocalPlayer,
      inventory: this.inventory.serialize(),
      targetItem: this.targetItem,
    }
  }

  deserialize(data) {
    if (data.inventory) {
      this.inventory.deserialize(data.inventory)
    }
    // remove inventory key from data or it'll overwrite this.inventory
    delete data.inventory
    super.deserialize(data)
  }

  setTargetItem(groundItem) {
    this.targetItem = groundItem
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
