import { ART_SCALE } from './constants.js'
import { Sprite, Container } from 'pixi.js'
import { Textures } from '../client/src/textures.js'
import InventorySlot from './inventory-slot.js'
import LivingEntity from './living-entity.js'
import PlayerInventory from './player-inventory.js'
import ItemSlotType from './item-slot-type.js'

class Player extends LivingEntity {
  constructor(socketId, playerId, pather, texture, world, color) {
    super(playerId, pather, texture, world, color)

    this.socketId = socketId
    this.playerId = playerId

    this.inventory = new PlayerInventory({}, [])
    if (this.world) {
      this.inventory.store.subscribe((content) =>
        this.setEquipped(content.equipped)
      )
    }
  }

  setEquipped(equipped) {
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
    }
  }
}

export default Player
