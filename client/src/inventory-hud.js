import { ART_SCALE, INVENTORY_WIDTH, INVENTORY_HEIGHT } from '../../shared/constants.js'
import { Graphics, Container, Sprite } from 'pixi.js'
import { Textures } from './textures.js'
import ItemSlotType from '../../shared/item-slot-type.js'

class InventoryHud extends Container {
  constructor() {
    super()
    const bg = new Graphics()
      .rect(0, 0, INVENTORY_WIDTH, INVENTORY_HEIGHT)
      .fill(0xffffff)
    bg.alpha = 0.5
    bg.x = 0
    bg.y = 0
    this.addChild(bg)

    const bgImg = Sprite.from(Textures.inventory.background)
    bgImg.scale.x = 1
    bgImg.scale.y = 1
    bgImg.width = 400
    bgImg.height = 600
    this.addChild(bgImg)

    // for each item slot type, draw a square and put a label above it
    // Object.keys(ItemSlotType).forEach((key) => {})
      console.log(bgImg.width, bgImg.height)
  }
}

export default InventoryHud
