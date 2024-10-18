import { Container } from 'pixi.js'
import { DEBUG } from '../../shared/constants.js'
import InventoryHud from './inventory-hud.js'

class Hud extends Container {
  constructor(app, player, screenWidth, screenHeight) {
    super()
    this.inventory = new InventoryHud(app, player)
    this.inventory.visible = false
    this.addChild(this.inventory)

    if (DEBUG) {
      this.toggleInventory(screenWidth, screenHeight)
    }
  }

  toggleInventory(screenWidth, screenHeight) {
    this.inventory.visible = !this.inventory.visible
    this.inventory.x = screenWidth - this.inventory.width
    this.inventory.y = screenHeight - this.inventory.height
  }
}

export default Hud
