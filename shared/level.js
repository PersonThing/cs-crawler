import { Container, Sprite } from "pixi.js"

class Level {
  constructor(stage) {
    this.tileGrid = []
    this.stage = stage
    this.container = new Container()
    if (this.stage != null) {
      this.stage.addChild(this.container)
    }
  }
  
  setTile(tile, x, y) {
    if (!this.tileGrid[y]) {
      this.tileGrid[y] = []
    }

    if (this.tileGrid[y][x]) {
      this.tileGrid[y][x].onUnload()
      delete this.tileGrid[y][x]
    }

    this.tileGrid[y][x] = tile
  }


  onClientTick(deltaMS, localPlayer, screenWidth, screenHeight) {
    // only render the tiles around the local player
    // figure out which tile the local player is inside
    const tileX = Math.floor(localPlayer.x / 320)
    const tileY = Math.floor(localPlayer.y / 320)

    // compute the bounds of the screen in tiles
    const screenTileWidth = Math.ceil(screenWidth / 320)
    const screenTileHeight = Math.ceil(screenHeight / 320)

    // how many tiles around the player to render
    const renderWidth = Math.ceil(screenTileWidth / 2)
    const renderHeight = Math.ceil(screenTileHeight / 2)

    // this could be optimized
    this.tileGrid.forEach((tileRow, y) => {
      tileRow.forEach((tile, x) => {
        if (!tile) return

        // if tile is NOT around the player's current tile, unrender it
        if (tile.rendered && Math.abs(x - tileX) > renderWidth || Math.abs(y - tileY) > renderHeight) {
          tile.unrender(this.container)
        }

        // if tile is around player's current tile and not yet rendered, render it
        if (!tile.rendered && Math.abs(x - tileX) <= renderWidth && Math.abs(y - tileY) <= renderHeight) {
          tile.render(this.container)
          tile.setPosition(x*320, y*320)
        }
      })
    })
  }
}

export default Level
