import LivingEntityState from './living-entity-state.js'
import Inventory from './inventory-state.js'
import { BLOCK_SIZE } from '../config/constants.js'
import groundItemsStore from '../stores/ground-items-store.js'

class PlayerState extends LivingEntityState {
  constructor({ playerId, socketId, username, color, inventory, pather, x = 0, y = 0 }) {
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
    this.targetItem = null

    this.inventory = new Inventory(playerId, inventory)
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
          groundItemsStore.removeLocally(this.targetItem.item.id)
          this.targetItem = null
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
    super.deserialize(data)
    if (data.inventory) {
      this.inventory.deserialize(data.inventory)
    }
  }
}

export default PlayerState
