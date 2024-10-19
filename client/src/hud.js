import { Container } from 'pixi.js'
import { DEBUG } from '../../shared/constants.js'
import InventoryHud from './inventory-hud.js'
import screenSizeStore from './screen-size-store.js'

class Hud extends Container {
  constructor(app, player) {
    super()
    this.inventory = new InventoryHud(app, player)
    this.addChild(this.inventory)
    this.inventory.visible = DEBUG

    screenSizeStore.subscribe(({ width, height }) => {
      this.inventory.x = width - this.inventory.width
      this.inventory.y = height - this.inventory.height
    })
  }

  toggleInventory() {
    this.inventory.visible = !this.inventory.visible
  }
}

export default Hud
