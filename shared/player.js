import { BLOCK_SIZE } from './constants.js'
import { Sprite, Container } from 'pixi.js'
import { Textures } from '../client/src/textures.js'
import InventorySlot from './inventory-slot.js'
import LivingEntity from './living-entity.js'
import PlayerInventory from './player-inventory.js'
import EntityStats from './entity-stats.js'

class Player extends LivingEntity {
  constructor(socketId, label, playerId, pather, texture, world, color) {
    super(label, pather, texture, world, color)

    this.socketId = socketId
    this.playerId = playerId

    this.inventory = new PlayerInventory(playerId)
    if (this.world) {
      this.inventory.store.subscribe((content) => {
        this.setEquipped(content.equipped)
      })
    }

    this.stats = new EntityStats(this)
  }

  onTick(delta) {
    super.onTick(delta)

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

  setEquipped(equipped) {
    // this is only relevant for rendering, can skip on server
    if (!this.world) return;

    if (this.equippedSpriteContainer != null) {
      this.equippedSpriteContainer.destroy()
      this.entitySprite.removeChild(this.equippedSpriteContainer)
    }

    this.equippedSpriteContainer = new Container()
    this.entitySprite.addChild(this.equippedSpriteContainer)

    Object.keys(equipped)
      .filter(
        (slotName) =>
          equipped[slotName] != null &&
          equipped[slotName].equippedTexture != null &&
          slotName.indexOf('Bonus') === -1
      )
      .forEach((slotName) => {
        const item = equipped[slotName]
        if (item != null) {
          this.attachItemSprite(
            item.equippedTexture,
            slotName === InventorySlot.OffHand.name
          )
        }
      })

    // if no mainhand equipped, render a hand
    if (equipped[InventorySlot.MainHand.name] == null) {
      this.attachItemSprite(Textures.item.weapon.hand, false)
    }

    // if no offhand equipped, and no 2h mainhand equipped, render a hand
    if (equipped[InventorySlot.OffHand.name] == null && equipped[InventorySlot.MainHand.name]?.itemType.bothHands != true) {
      this.attachItemSprite(Textures.item.weapon.hand, true)
    }
  }

  attachItemSprite(texture, shouldMirrorTexture) {
    const sprite = Sprite.from(texture)
    sprite.anchor.set(0.5)
    this.equippedSpriteContainer.addChild(sprite)
    if (shouldMirrorTexture) {
      sprite.scale.x = -1
    }
  }

  setLabel(label) {
    super.setLabel(label)
  }

  serialize() {
    return {
      ...super.serialize(),
      socketId: this.socketId,
      playerId: this.playerId,
    }
  }
}

export default Player
