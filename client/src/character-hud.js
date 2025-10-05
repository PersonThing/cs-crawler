import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '../../shared/constants.js'

import localPlayerStore from '../../shared/state/local-player.js'

const STAT_SIZE = 18
const STAT_MARGIN = 8
const WIDTH = 200
const HEIGHT = 300

class CharacterHud extends Container {
  constructor(app) {
    super()

    this.app = app

    this.content = null
    this.renderBackground()

    this.stats = {}

    const player = localPlayerStore.get()
    this.subscribeToPlayerStats(player.stats)
    localPlayerStore.subscribe(player => {
      this.subscribeToPlayerStats(player.stats)
    });

    // kill any click events that bubble through
    this.eventMode = 'static'
    this.on('mousedown', event => {
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }

  subscribeToPlayerStats(playerStats) {
    if (this.unsubscribePlayerStats) {
      this.unsubscribePlayerStats()
    }

    this.playerStats = playerStats
    this.unsubscribePlayerStats = this.playerStats.store.subscribe(stats => {
      this.stats = stats
      this.renderStats()
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
      .roundRect(0, 0, WIDTH, HEIGHT, 6)
      .fill(HUD_FILL_COLOR)
      .stroke({
        color: HUD_BORDER_COLOR,
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
            fontSize: 14,
            fill: 0xffffff,
          },
          x: 20,
          y: 50 + index * (STAT_SIZE + STAT_MARGIN),
        })
        this.statContainer.addChild(statText)
      })
  }
}

export default CharacterHud
