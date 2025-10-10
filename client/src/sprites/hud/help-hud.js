import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'

const keyBindings = [
  { key: 'I or B', action: 'Toggle inventory' },
  { key: 'C', action: 'Toggle character sheet' },
  { key: 'F1', action: 'Toggle help' },
  { key: 'F2', action: 'Toggle debug mode' },
  { key: 'F3', action: 'Set username' },
  { key: 'Left click', action: 'Move' },
  { key: 'Right click', action: 'Attack' },
  { key: 'Tab', action: 'Toggle fullscreen minimap' },
  { key: 'Scroll wheel', action: 'Zoom minimap' },

  // inventory
  { key: 'Left click', action: 'Inventory: Pick up item' },
  { key: 'Right click', action: 'Inventory: Equip item' },
  { key: 'Shift + Right click', action: 'Inventory: Equip item (to offhand if possible)' },
  { key: 'Ctrl + Right click', action: 'Inventory: Drop item' },

  // temp keys
  { key: 'G', action: 'Generate items on ground' },
  { key: 'V', action: 'Clear items on ground' },
  { key: 'N', action: 'Pick up random item' },
  { key: 'M', action: 'Fill inventory with random items' },
  { key: ',', action: 'Clear inventory & equipped items' },
]

const STAT_SIZE = 18
const STAT_MARGIN = 8
const WIDTH = 400
const HEIGHT = 60 + keyBindings.length * (STAT_SIZE + STAT_MARGIN)

class HelpHud extends Container {
  constructor(app) {
    super()

    this.app = app

    this.content = null
    this.renderBackground()

    // kill any click events that bubble through
    this.eventMode = 'static'
    this.on('mousedown', event => {
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }

  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }
    this.bg = new Container()
    this.addChild(this.bg)

    const gfx = new Graphics().roundRect(0, 0, WIDTH, HEIGHT, 6).fill(HUD_FILL_COLOR).stroke({
      color: HUD_BORDER_COLOR,
      width: 4,
    })
    gfx.alpha = 0.8
    gfx.x = 0
    gfx.y = 0
    this.bg.addChild(gfx)

    // title
    const title = new Text({
      text: 'Help',
      style: {
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
      x: 10,
      y: 10,
    })
    this.bg.addChild(title)

    // instructions
    keyBindings.forEach((binding, index) => {
      const actionText = new Text({
        text: binding.action,
        style: {
          fontSize: 12,
          fill: 0x666666,
        },
        x: 20,
        y: 50 + index * (STAT_SIZE + STAT_MARGIN),
      })
      this.bg.addChild(actionText)

      const keyText = new Text({
        text: binding.key,
        style: {
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
        x: 220,
        y: 50 + index * (STAT_SIZE + STAT_MARGIN),
      })
      this.bg.addChild(keyText)
    })
  }
}

export default HelpHud
