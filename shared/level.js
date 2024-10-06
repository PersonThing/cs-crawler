class Level {
  constructor() {
    this.tileGrid = []
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
}

export default Level
