import { ART_SCALE, INVENTORY_WIDTH, INVENTORY_HEIGHT } from '../../shared/constants.js'
import { Graphics, Container, Sprite } from 'pixi.js'
import { Textures } from './textures.js'
import ItemSlotType from '../../shared/item-slot-type.js'

class InventoryHud extends Container {
  constructor() {
    super()

    // for each item slot type, draw a square and put a label above it
    // Object.keys(ItemSlotType).forEach((key) => {})
    // const bg = new Graphics()
    //   .rect(0, 0, INVENTORY_WIDTH, INVENTORY_HEIGHT)
    //   .fill(0xffffff)
    // bg.alpha = 0.5
    // bg.x = 0
    // bg.y = 0
    // this.addChild(bg)

    const bg = Sprite.from(Textures.inventory.background)
    bg.scale.x = ART_SCALE
    bg.scale.y = ART_SCALE
    bg.alpha = 0.5

    this.addChild(bg)
  }
}

export default InventoryHud
