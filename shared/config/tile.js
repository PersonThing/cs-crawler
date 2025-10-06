class Tile {
  constructor(label) {
    this.label = label
    this.blockGrid = []
    this.connections = {
      up: null,
      right: null,
      down: null,
      left: null
    }
  }

  setBlock(block) {
    if (!this.blockGrid[block.y]) {
      this.blockGrid[block.y] = []
    }

    if (this.blockGrid[block.y][block.x]) {
      this.blockGrid[block.y][block.x].onUnload()
      delete this.blockGrid[block.y][block.x]
    }

    this.blockGrid[block.y][block.x] = block
  }
}

export default Tile