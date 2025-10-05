import { Container } from 'pixi.js'
import { DEBUG } from '../../shared/constants.js'
import InventoryHud from './inventory-hud.js'
import screenSizeStore from './screen-size-store.js'
import CharacterHud from './character-hud.js'
import HelpHud from './help-hud.js'

class Hud extends Container {
  constructor(app, player) {
    super()

    this.inventory = new InventoryHud(app, player)
    this.addChild(this.inventory)
    this.inventory.visible = DEBUG.get()

    this.character = new CharacterHud(app, player)
    this.addChild(this.character)
    this.character.visible = DEBUG.get()

    this.help = new HelpHud(app)
    this.addChild(this.help)
    this.help.visible = false
    
    screenSizeStore.subscribe(({ width, height }) => {
      // inventory aligned to bottom right of screen
      this.inventory.x = width - this.inventory.width
      this.inventory.y = height - this.inventory.height

      // character sheet aligned to bottom left of screen
      this.character.y = height - this.character.height

      // help sheet aligned to top left of screen
      this.help.x = 10
      this.help.y = 10
    })

  }

  toggleInventory() {
    this.inventory.visible = !this.inventory.visible
  }

  toggleCharacterSheet() {
    this.character.visible = !this.character.visible
  }

  toggleHelp() {
    this.help.visible = !this.help.visible
  }
}

export default Hud
