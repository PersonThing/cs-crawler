import { Container, BlurFilter, Rectangle, Graphics, Sprite } from 'pixi.js'
import LevelSprite from '../client/src/level-sprite'

class World extends Container {
  constructor(app, levelConfig) {
    super()

    this.app = app

    this.players = []
    this.enemies = []

    this.levelConfig = levelConfig

    this.levelContainer = new Container()
    this.addChild(this.levelContainer)

    this.levelSprite = new LevelSprite(levelConfig, 1, false)
    this.addChild(this.levelSprite)

    this.mask = this.createLightRadiusMask()
  }

  createLightRadiusMask() {
    const radius = 700
    const blurSize = 500
    let circle = new Graphics()
      .circle(radius + blurSize, radius + blurSize, radius)
      .fill(0xff0000)
    circle.alpha = 1

    const blurFilter = new BlurFilter()
    blurFilter.blur = blurSize
    blurFilter.quality = 10
    circle.filters = [blurFilter]

    const bounds = new Rectangle(
      0,
      0,
      (radius + blurSize) * 2,
      (radius + blurSize) * 2
    )
    const texture = this.app.renderer.generateTexture({
      target: circle,
      resolution: 1,
      frame: bounds,
    })
    const focus = new Sprite(texture)
    focus.anchor.set(0.5)
    this.addChild(focus)
    return focus
  }

  onTick(time, localPlayer, screenWidth, screenHeight) {
    // center view on local player
    if (localPlayer) {
      this.x = -localPlayer.x + screenWidth / 2
      this.y = -localPlayer.y + screenHeight / 2
      this.mask.x = localPlayer.x
      this.mask.y = localPlayer.y
    }

    // update the rendered level
    this.levelSprite.onTick(localPlayer, screenWidth, screenHeight)

    // update players
    this.players.forEach((player) => {
      player.onTick(time.deltaMS)
    })

    // update enemies
    this.enemies.forEach((enemy) => {
      enemy.onTick(time.deltaMS)
    })
  }

  addPlayer(player) {
    this.players.push(player)
    this.addChild(player)
  }

  removePlayer(player) {
    this.players = this.players.filter((p) => p !== player)
    this.removeChild(player)
  }
}

export default World