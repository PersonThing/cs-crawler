import { Container } from 'pixi.js'
import InventoryHud from './inventory-hud.js'

class Hud extends Container {
  constructor(screenWidth, screenHeight) {
    super()
    this.inventory = new InventoryHud()
    this.inventory.visible = false
    this.addChild(this.inventory)
  }

  toggleInventory(screenWidth, screenHeight) {
    this.inventory.visible = !this.inventory.visible
    this.inventory.x = screenWidth - this.inventory.width
    this.inventory.y = screenHeight - this.inventory.height
  }
}

export default Hud