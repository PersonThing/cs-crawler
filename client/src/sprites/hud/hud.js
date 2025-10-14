import { Container } from 'pixi.js'
import { DEBUG, MINIMAP_HEIGHT, HUD_PLAYERS_WIDTH } from '#shared/config/constants.js'
import InventoryHud from './inventory-hud.js'
import screenSizeStore from '../../stores/screen-size-store.js'
import CharacterHud from './character-hud.js'
import HelpHud from './help-hud.js'
import PlayersHud from './players-hud.js'
import Minimap from './minimap.js'
import PlayerControls from '../../player-controls.js'
import InventorySoundMonitor from '../../inventory-sound-monitor.js'
import ActionBarHud from './action-bar-hud.js'

class Hud extends Container {
  constructor(app, world, levelConfig) {
    super()

    this.eventMode = 'static'
    
    this.minimap = new Minimap(levelConfig, false)
    this.addChild(this.minimap)

    this.character = new CharacterHud()
    this.addChild(this.character)
    this.character.visible = DEBUG.get()

    this.players = new PlayersHud()
    this.addChild(this.players)
    this.players.x = 0
    this.players.y = 0

    this.help = new HelpHud()
    this.addChild(this.help)
    this.help.visible = false
    this.help.x = 0
    this.help.y = 0

    this.inventory = new InventoryHud(app)
    this.addChild(this.inventory)
    this.inventory.visible = DEBUG.get()

    this.actionBar = new ActionBarHud(app, this)
    this.addChild(this.actionBar)
    
    screenSizeStore.subscribe(({ width, height }) => {
      // minimap aligned to top right
      this.minimap.x = width - this.minimap.width / 2 - 10
      this.minimap.y = 0

      // character sheet aligned to bottom left of screen
      this.character.y = height - this.character.height

      // inventory aligned to bottom right of screen
      this.inventory.x = width - this.inventory.width
      this.inventory.y = height - this.inventory.height
    })

    this.playerControls = new PlayerControls(app, world, this.minimap, this)
    this.inventorySoundMonitor = new InventorySoundMonitor()
  }

  toggleInventory() {
    this.inventory.visible = !this.inventory.visible
  }

  toggleCharacterSheet() {
    this.character.visible = !this.character.visible
  }

  toggleHelp() {
    this.help.visible = !this.help.visible

    // if help is visible, move players to the right of it
    if (this.help.visible) {
      this.players.x = this.help.width + 10
    } else {
      this.players.x = 0
    }
  }

  closeAllHuds() {
    // Close all HUD panels
    this.inventory.visible = false
    this.character.visible = false
    this.help.visible = false
    
    // Reset players position when help is closed
    this.players.x = 0
    
    // Close ability selection menu if open
    if (this.actionBar && this.actionBar.abilityMenu) {
      this.actionBar.closeAbilityMenu()
    }
  }

  tick(time) {
    this.minimap.tick()
    this.inventory.tick()
    this.actionBar.tick()
  }

  destroy() {
    this.playerControls.stopListening()
    this.inventorySoundMonitor.destroy()
    this.actionBar.destroy()
  }
}

export default Hud
