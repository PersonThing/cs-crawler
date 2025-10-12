import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'

import playerSpriteStore from '../../stores/player-sprite-store.js'

const STAT_SIZE = 12
const STAT_MARGIN = 10
const WIDTH = 300
const HEIGHT = 400

class CharacterHud extends Container {
  constructor() {
    super()

    this.content = null
    this.renderBackground()

    this.stats = {}
    this.unsubscribeFromPlayers = playerSpriteStore.subscribe(players => {
      const player = players.find(p => p.isLocalPlayer)
      this.stats = player?.state?.stats || {}
      this.renderStats()
    })

    // kill any click events that bubble through
    this.eventMode = 'static'
    this.on('pointerdown', event => {
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }

  destroy() {
    if (this.unsubscribeFromPlayers) {
      this.unsubscribeFromPlayers()
    }
  }

  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }
    this.bg = new Container()
    this.addChild(this.bg)

    const gfx = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill(HUD_FILL_COLOR).stroke({
      color: HUD_BORDER_COLOR,
      width: 4,
    })
    gfx.alpha = 0.5
    gfx.x = 0
    gfx.y = 0
    this.bg.addChild(gfx)

    // stats text
    const title = new Text({
      text: 'Stats',
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
            fontSize: STAT_SIZE,
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
