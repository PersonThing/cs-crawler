import { Container } from 'pixi.js'

class Hud extends Container {
  constructor(screenWidth, screenHeight) {
    super()
    this.inventory = new InventoryHud(600, 800)
    this.inventory.x = screenWidth - this.inventory.width
    this.inventory.y = screenHeight - this.inventory.height
    this.inventory.visible = false
    this.addChild(this.inventory)
  }

  toggleInventory() {
    this.inventory.visible = !this.inventory.visible
  }
}

export default Hud