import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '../../shared/constants.js'

import playersStore from '../../shared/state/players.js'

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
  }

  render(players) {
    this.renderBackground()

    // loop the players and render them


  }
}

export default PlayersHud
