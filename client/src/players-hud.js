import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR, LOCAL_PLAYER_COLOR, OTHER_PLAYER_COLOR } from '../../shared/constants.js'

import playersStore from '../../shared/state/players-store.js'
import localPlayerStore from '../../shared/state/local-player-store.js'

const WIDTH = 200
const HEIGHT = 300

class PlayersHud extends Container {
  constructor() {
    super()
    playersStore.subscribe(players => {
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

    // const gfx = new Graphics()
    //   .roundRect(0, 0, WIDTH, HEIGHT, 6)
    //   .fill(HUD_FILL_COLOR)
    //   .stroke({
    //     color: HUD_BORDER_COLOR,
    //     width: 4,
    //   })
    // gfx.alpha = 0.5
    // gfx.x = 0
    // gfx.y = 0
    // this.bg.addChild(gfx)
  }

  render(players) {
    const localPlayer = localPlayerStore.get()

    this.renderBackground()

    // loop the players and render them
    let y = 10
    for (const playerId in players) {
      const player = players[playerId]
      const label = player.label || playerId
      const text = new Text({
        text: `${label}
healthbar here
manabar here`,
        style: {
          fontSize: 12,
          fill: player.playerId == localPlayer?.playerId ? LOCAL_PLAYER_COLOR : OTHER_PLAYER_COLOR,
        },
      })
      text.x = 10
      text.y = y
      this.bg.addChild(text)
      y += 50
    }        
  }
}

export default PlayersHud
