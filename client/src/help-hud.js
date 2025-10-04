import { Graphics, Container, Text } from 'pixi.js'

const keyBindings = [
  { key: 'I or B', action: 'Toggle Inventory' },
  { key: 'C', action: 'Toggle Character Sheet' },
  { key: 'F1', action: 'Toggle Help' },
  { key: 'Left click', action: 'Move' },
  { key: 'Tab', action: 'Toggle minimap' },

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

    const gfx = new Graphics().roundRect(0, 0, WIDTH, HEIGHT, 6).fill(0x333333).stroke({
      color: 0x555555,
      width: 4,
    })
    gfx.alpha = 0.5
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
          fontSize: 14,
          fill: 0x666666,
        },
        x: 20,
        y: 50 + index * (STAT_SIZE + STAT_MARGIN),
      })
      this.bg.addChild(actionText)

      const keyText = new Text({
        text: binding.key,
        style: {
          fontSize: 14,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
        x: 250,
        y: 50 + index * (STAT_SIZE + STAT_MARGIN),
      })
      this.bg.addChild(keyText)
    })
  }
}

export default HelpHud
