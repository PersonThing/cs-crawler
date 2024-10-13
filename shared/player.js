import { Sprite, Container } from 'pixi.js'
import { Textures } from '../client/src/textures.js'
import LivingEntity from './living-entity.js'
import PlayerInventory from './player-inventory.js'
import InventorySlot from './inventory-slot.js'


const EQUIPPED_SLOTS_TO_RENDER = [
  InventorySlot.OffHand.name, 
  InventorySlot.MainHand.name, 
  InventorySlot.Head.name
]

class Player extends LivingEntity {
  constructor(socketId, name, pather, texture, world, color) {
    super(name, pather, texture, world, color)

    this.socketId = socketId

    this.inventory = new PlayerInventory({}, [])
    this.inventory.store.subscribe(content => this.setEquipped(content.equipped))
  }

  setEquipped(equipped) {
    if (this.equippedSpriteContainer != null) {
      this.equippedSpriteContainer.destroy()
      this.removeChild(this.equippedSpriteContainer)
    }

    this.equippedSpriteContainer = new Container()
    this.addChild(this.equippedSpriteContainer)

    EQUIPPED_SLOTS_TO_RENDER.forEach(slotName => {
      const item = equipped[slotName]
      if (item != null) {
        const sprite = Sprite.from(item.equippedTexture)
        this.equippedSpriteContainer.addChild(sprite)
      }
    })
  }

  setLabel(label) {
    super.setLabel(label)
  }

  serialize() {
    return {
      ...super.serialize(),
      socketId: this.socketId,
      tempWeaponIndex: this.tempWeaponIndex,
      tempArmorIndex: this.tempArmorIndex,
      inventory: this.inventory.serialize(),
    }
  }

  syncWithServer(data) {
    super.syncWithServer(data)
    // this.inventory.deserialize(data.inventory)
  }
}

export default Player
