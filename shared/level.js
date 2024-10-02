import { Sprite } from "pixi.js"

class Level {
  constructor() {
    this.tileGrid = []
  }

  render(stage) {
    this.tileGrid.forEach((tileRow, y) => {
      tileRow.forEach((tile, x) => {
        if (!tile) return
        tile.render(stage)
        tile.setPosition(x, y)
      })
    })
  }

  setTile(tile, x, y) {
    if (!this.tileGrid[x]) {
      this.tileGrid[x] = []
    }

    if (this.tileGrid[x][y]) {
      this.tileGrid[x][y].onUnload()
      delete this.tileGrid[x][y]
    }

    this.tileGrid[x][y] = tile
  }
}

export default Level
