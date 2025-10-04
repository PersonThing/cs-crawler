import { Graphics, Container, Text } from 'pixi.js'

const STAT_SIZE = 18
const STAT_MARGIN = 4
const CHARACTER_SHEET_WIDTH = 200
const CHARACTER_SHEET_HEIGHT = 300

class InventoryHud extends Container {
  constructor(app, player) {
    super()

    this.app = app

    this.content = null
    this.renderBackground()

    this.stats = {}

    this.playerStats = player.stats
    this.playerStats.store.subscribe(stats => {
      this.stats = stats
      this.renderStats()
    })

    // kill any click events that bubble through, so player doesn't move when clicking inside character sheet
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

    const gfx = new Graphics()
      .roundRect(0, 0, CHARACTER_SHEET_WIDTH, CHARACTER_SHEET_HEIGHT, 6)
      .fill(0x333333)
      .stroke({
        color: 0x555555,
        width: 4,
      })
    gfx.alpha = 0.5
    gfx.x = 0
    gfx.y = 0
    this.bg.addChild(gfx)

    // stats text
    const title = new Text({
      text: 'Character stats',
      style: {
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
      x: 10,
      y: 10,
    })
    this.bg.addChild(title)
  }

  renderStats() {
    // clear old stats
    if (this.statContainer) {
      this.removeChild(this.statContainer)
      this.statContainer.destroy()
    }
    this.statContainer = new Container()
    this.addChild(this.statContainer)

    // render new stats
    Object.keys(this.stats)
      .sort()
      .forEach((statName, index) => {
        const statValue = this.stats[statName]
        const statText = new Text({
          text: `${statName}: ${statValue}`,
          style: {
            fontSize: 12,
            fill: 0xffffff,
          },
          x: 20,
          y: 50 + index * (STAT_SIZE + STAT_MARGIN),
        })
        this.statContainer.addChild(statText)
      })
  }
}

export default InventoryHud
