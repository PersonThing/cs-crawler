import { Container, Graphics, Sprite } from 'pixi.js'
import { GrayscaleFilter } from 'pixi-filters/grayscale'
import LevelSprite from './level-sprite'

class Minimap {
  constructor(app, level, width, height, scale) {
    this.level = level
    this.app = app
    this.width = width
    this.height = height
    this.scale = scale
    this.remotePlayerDots = {}

    this.container = new Container()
    this.mask = new Graphics()
    this.mask.rect(0, 0, this.width, this.height)
    this.mask.fill(0xff0000)
    this.container.addChild(this.mask)
    this.map = new LevelSprite(this.level, this.scale, false, [
      new GrayscaleFilter(),
    ])
    this.container.addChild(this.map)
    this.container.mask = this.mask
    this.map.sortableChildren = true
    app.stage.addChild(this.container)
  }

  onTick(localPlayer, remotePlayers) {
    this.container.x = this.app.screen.width - this.width
    this.container.y = 0

    if (localPlayer != null) {
      // update map
      this.map.onTick(localPlayer, this.width, this.height)

      // update local player dot
      if (!this.localPlayerDot) {
        this.localPlayerDot = this.makePlayerDot(0x00ff00)
        this.map.addChild(this.localPlayerDot)
      }
      this.localPlayerDot.x = localPlayer.x * this.scale
      this.localPlayerDot.y = localPlayer.y * this.scale

      // center map on player
      this.map.x = -this.localPlayerDot.x + this.width / 2
      this.map.y = -this.localPlayerDot.y + this.height / 2

      // update remote player dots
      if (remotePlayers != null) {
        Object.entries(remotePlayers).forEach(([id, player]) => {
          if (!this.remotePlayerDots[id]) {
            this.remotePlayerDots[id] = this.makePlayerDot(0x0000ff)
            this.map.addChild(this.remotePlayerDots[id])
          }
          this.remotePlayerDots[id].x = player.x * this.scale
          this.remotePlayerDots[id].y = player.y * this.scale
        })
        Object.keys(this.remotePlayerDots)
          .filter((id) => !remotePlayers[id])
          .forEach((id) => {
            this.map.removeChild(this.remotePlayerDots[id])
            delete this.remotePlayerDots[id]
          })
      }
    }
  }

  makePlayerDot(color) {
    const graphic = new Graphics().circle(0, 0, 5).fill(color)
    graphic.zIndex = 10
    return graphic
  }
}

export default Minimap
