import { Container, Graphics, Sprite } from 'pixi.js'

class Minimap {
  constructor(level, stage) {
    this.level = level
    this.container = new Container()
    stage.addChild(this.container)
  }

  onTick(localPlayer) {
    if (!this.mask) {
      this.mask = new Graphics()
      this.mask.rect(0, 0, 200, 200)
      this.mask.fill(0xff0000, 0.5)
      this.container.addChild(this.mask)
    }

    if (localPlayer != null ) {
      this.container.x = localPlayer.x + 400
      this.container.y = localPlayer.y - 250
    }

    // render a tiny version of the level
    // it'll be masked by a small rectangle and semi-transparent
    this.level.tileGrid.forEach((tileRow, y) => {
      tileRow.forEach((tile, x) => {
        if (!tile) return

        if (!tile.miniSprite) {
          // tile.miniSprite = Sprite.from(tile.texture)
          // tile.miniSprite.scale.x = 0.25
          // tile.miniSprite.scale.y = 0.25
          // tile.miniSprite.x = x * 4
          // tile.miniSprite.y = y * 4
          // this.container.addChild(tile.miniSprite)
        }
      })
    })
  }
}

export default Minimap