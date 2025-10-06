import { Container } from 'pixi.js'
import { DEBUG, MINIMAP_HEIGHT, HUD_PLAYERS_WIDTH } from '#shared/config/constants.js'
import InventoryHud from './inventory-hud.js'
import screenSizeStore from '../../stores/screen-size-store.js'
import CharacterHud from './character-hud.js'
import HelpHud from './help-hud.js'
import PlayersHud from './players-hud.js'
import Minimap from './minimap.js'
import PlayerControls from '../../player-controls.js'

class Hud extends Container {
  constructor(app, world, levelConfig) {
    super()

    this.inventory = new InventoryHud()
    this.addChild(this.inventory)
    this.inventory.visible = DEBUG.get()

    this.character = new CharacterHud()
    this.addChild(this.character)
    this.character.visible = DEBUG.get()

    this.help = new HelpHud()
    this.addChild(this.help)
    this.help.visible = false

    this.players = new PlayersHud()
    this.addChild(this.players)
    
    this.minimap = new Minimap(levelConfig, false)
    this.addChild(this.minimap)
    
    screenSizeStore.subscribe(({ width, height }) => {
      // minimap aligned to top right
      this.minimap.x = width - this.minimap.width / 2 - 10
      this.minimap.y = 0

      // inventory aligned to bottom right of screen
      this.inventory.x = width - this.inventory.width
      this.inventory.y = height - this.inventory.height

      // character sheet aligned to bottom left of screen
      this.character.y = height - this.character.height

      // help sheet aligned to top left of screen
      this.help.x = 10
      this.help.y = 10

      // players list aligned to top right of screen, under minimap
      this.players.x = width - HUD_PLAYERS_WIDTH
      this.players.y = MINIMAP_HEIGHT + 10
    })

    this.playerControls = new PlayerControls(app, world, this.minimap, this)
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

  onTick(time) {
    this.minimap.onTick()
    this.inventory.onTick()
  }

  destroy() {
    this.playerControls.stopListening()
  }
}

export default Hud
