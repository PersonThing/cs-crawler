import { BLOCK_SIZE } from './constants.js'
import LivingEntity from './living-entity.js'
import PlayerInventory from './player-inventory.js'
import EntityStats from './entity-stats.js'

class Player extends LivingEntity {
  constructor(socketId, username, playerId, pather, texture, world, color) {
    super(username, pather, texture, world, color)

    this.socketId = socketId
    this.playerId = playerId
    this.username = username

    this.inventory = new PlayerInventory(playerId)
    if (this.world) {
      this.inventory.store.subscribe((content) => {
        this.setEquipped(content.equipped)
      })
    }

    this.stats = new EntityStats(this)
  }

  onTick(deltaMs) {
    super.onTick(deltaMs)

    if (this.targetItem != null) {
      // check if we're close enough to pick up the item
      const distance = Math.hypot(
        this.targetItem.position.x - this.x,
        this.targetItem.position.y - this.y
      )

      // if we're within 1 block, good enough
      if (distance < BLOCK_SIZE * 2) {
        if (this.inventory.pickup(this.targetItem.item)) {
          this.world.removeItem(this.targetItem.item)
          this.targetItem = null
        }
      }
    }
  }

  setTargetItem(targetItem) {
    this.targetItem = targetItem
  }

  setLabel(label) {
    super.setLabel(label)
  }

  serialize() {
    return {
      ...super.serialize(),
      socketId: this.socketId,
      playerId: this.playerId,
      username: this.username,
    }
  }
}

export default Player
