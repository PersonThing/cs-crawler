// each tile is a grid of 32x32 blocks


class Tile {
  // we will use the pathing approach built into cs-builder to optimize pathing through tiles
  constructor() {
    // tiles have a grid of blocks, each of which define whether they can be walked on, seen through, shot through, etc
    // for example:
    // setBlock(1, 5, { canWalk: true, canSeeThrough: true, canShootThrough: true, texture: 'grass.png' })
    // places a block at x=1, y=5 that can be walked on, seen through, and shot through, with a grass texture
    this.blocks = [] // x, y grid of blocks

    // array of blocks that enter or exit this tile
    this.exits = []
  }

  setBlock(block) {
    // make sure we have a y array at the x coordinate
    if (!this.blocks[block.x]) {
      this.blocks[block.x] = []
    }

    // if there's already a block here, unload and delete it
    if (this.blocks[block.x][block.y]) {
      this.blocks[block.x][block.y].onUnload()
      delete this.blocks[block.x][block.y]
    }

    this.blocks[block.x][block.y] = block
  }
}

export default Tile