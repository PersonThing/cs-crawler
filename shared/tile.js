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
    if (!this.blockGrid[block.y]) {
      this.blockGrid[block.y] = []
    }

    if (this.blockGrid[block.y][block.x]) {
      this.blockGrid[block.y][block.x].onUnload()
      delete this.blockGrid[block.y][block.x]
    }

    this.blockGrid[block.y][block.x] = block
  }

  render(levelContainer) {
    this.container = new Container()
    this.container.x = 0
    this.container.y = 0
    this.blockGrid.forEach((blockRow) => {
      blockRow.filter(b => b.texture != null).forEach((block) => {
        block.render(this.container, block.x * 32, block.y * 32)
      })
    })
    levelContainer.addChild(this.container)
    this.rendered = true
  }

  updateBlockVisibility(localPlayer) {
    // return
    this.blockGrid.forEach((blockRow) => {
      blockRow.filter(b => b.sprite != null).forEach((block) => {
        const dx = this.container.x + block.sprite.x - localPlayer.x
        const dy = this.container.y + block.sprite.y - localPlayer.y

        // if block.sprite is within 200px of the player, set it to discovered
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 200) {
          block.setAlpha(1)
        } else if (distance < 300 && block.sprite.alpha < 1) {
          block.setAlpha(0.5)
        }
      })
    })
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