import { Graphics, Container } from 'pixi.js'
import ItemSlotType from '../../shared/item-slot-type.js'

class InventoryHud extends Container {
  constructor(width, height) {
    super()
    const bg = new Graphics().rect(0, 0, width, height).fill(0xffffff)
    bg.alpha = 0.5
    this.addChild(bg)

    // for each item slot type, draw a square and put a label above it
    Object.keys(ItemSlotType).forEach(key => {
      
    })
  }
}

export default InventoryHud