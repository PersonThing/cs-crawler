import { ART_SCALE } from './constants.js'
import { Sprite, Container } from 'pixi.js'
import { Textures } from '../client/src/textures.js'
import InventorySlot from './inventory-slot.js'
import LivingEntity from './living-entity.js'
import PlayerInventory from './player-inventory.js'
import ItemSlotType from './item-slot-type.js'

const EQUIPPED_SLOTS_TO_RENDER = [
  InventorySlot.OffHand.name,
  InventorySlot.MainHand.name,
  InventorySlot.Head.name,
]

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

    EQUIPPED_SLOTS_TO_RENDER.forEach((slotName) => {
      const item = equipped[slotName]
      if (item != null) {
        this.attachItemSprite(item.equippedTexture, slotName === InventorySlot.OffHand.name)
      }
    })

    // if no weapons equipped, add hands texture
    if (equipped[InventorySlot.MainHand.name] == null && equipped[InventorySlot.OffHand.name] == null) {
      this.attachItemSprite(Textures.item.weapon.hands, false)
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
    }
  }
}

export default Player