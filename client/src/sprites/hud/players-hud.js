import { Container, Text } from 'pixi.js'
import { HUD_PLAYERS_WIDTH, LOCAL_PLAYER_COLOR, OTHER_PLAYER_COLOR } from '#shared/config/constants.js'
import { renderHealthBar, createHealthBarGraphics } from '../../utils/health-bar-renderer.js'
import playerSpriteStore from '../../stores/player-sprite-store.js'

class PlayersHud extends Container {
  constructor() {
    super()
    this.width = HUD_PLAYERS_WIDTH
    playerSpriteStore.subscribe(players => {
      this.render(players)
    })
  }

  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }
    this.bg = new Container()
    this.addChild(this.bg)
  }

  render(players) {
    this.renderBackground()

    // loop the players and render them
    let y = 10
    for (const playerId in players) {
      const player = players[playerId]

      // Health bar visualization
      const healthBarWidth = 120
      const healthBarHeight = 15
      const healthBar = createHealthBarGraphics()
      renderHealthBar(
        healthBar,
        player.state.currentHealth,
        player.state.maxHealth,
        healthBarWidth,
        healthBarHeight,
        true // Show background
      )
      healthBar.x = 10
      healthBar.y = y
      this.bg.addChild(healthBar)

      // Player name and ID
      const text = new Text({
        text: `${player.state.username} | ${player.state.playerId.replace('player-', '')}`,
        style: {
          fontSize: 12,
          fontWeight: 'bold',
          fill: player.isLocalPlayer ? LOCAL_PLAYER_COLOR : OTHER_PLAYER_COLOR,
        },
      })
      text.x = 10
      text.y = y + healthBarHeight + 2
      this.bg.addChild(text)

      // Health text
      const healthText = new Text({
        text: `${player.state.currentHealth} / ${player.state.maxHealth}`,
        style: {
          fontSize: 12,
          fill: 0xffffff,
        },
      })
      healthText.x = 12
      healthText.y = y
      this.bg.addChild(healthText)

      y += 50
    }
  }
}

export default PlayersHud
