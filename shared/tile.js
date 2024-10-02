import { Container, Sprite } from "pixi.js"

class Tile {
  constructor() {
    this.blockGrid = []
    this.connections = {
      up: null,
      right: null,
      down: null,
      left: null
    }
  }

  setBlock(block) {
    if (!this.blockGrid[block.x]) {
      this.blockGrid[block.x] = []
    }

    if (this.blockGrid[block.x][block.y]) {
      this.blockGrid[block.x][block.y].onUnload()
      delete this.blockGrid[block.x][block.y]
    }

    this.blockGrid[block.x][block.y] = block
  }

  render(levelContainer) {
    this.container = new Container()
    this.container.x = 0
    this.container.y = 0
    this.blockGrid.forEach((blockRow) => {
      blockRow.forEach((block) => {
        if (block.texture) {
          const sprite = Sprite.from(block.texture)
          sprite.x = block.x * 32
          sprite.y = block.y * 32
          this.container.addChild(sprite)
        }
      })
    })
    levelContainer.addChild(this.container)
    this.rendered = true
  }

  unrender(levelContainer) {
    levelContainer.removeChild(this.container)
    delete this.container
    this.rendered = false
  }

  setPosition(x, y) {
    this.container.x = x
    this.container.y = y
  }
}

export default Tile