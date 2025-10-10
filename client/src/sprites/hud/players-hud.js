import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR, HUD_PLAYERS_WIDTH, LOCAL_PLAYER_COLOR, OTHER_PLAYER_COLOR } from '#shared/config/constants.js'

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
      const text = new Text({
        text: `${player.state.username} | ${player.state.playerId.replace('player-', '')}`,
        style: {
          fontSize: 14,
          fontWeight: 'bold',
          fill: player.isLocalPlayer ? LOCAL_PLAYER_COLOR : OTHER_PLAYER_COLOR,
        },
      })
      text.x = 10
      text.y = y
      this.bg.addChild(text)
      const text2 = new Text({
        text: `health bar here`,
        style: {
          fontSize: 12,
          fill: 0x888888,
        },
      })
      text2.x = 10
      text2.y = y + 15
      this.bg.addChild(text2)
      y += 50
    }        
  }
}

export default PlayersHud
