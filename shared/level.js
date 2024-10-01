
// each tile is a grid of 32x32 blocks

// blocks have properties that determine whether a player can walk on, see through, shoot through, etc
// blocks can also have interactions - on click, on enter, on leave, etc

// we will design blocks, then build up pre-built tiles that can be used to build levels

// initially, levels will be manually built, but we will eventually randomly generate them, linking tiles together
// to do that, tiles will need to define their entrances and/or exits
// and levels will need a strategy for deciding an entrance tile, exit tile, and linking them together

class Level {
  // a level is a collection of "tiles" that are used to build a map
  constructor() {
    // tiles are collections of blocks used to patch a level together
    // for example, we might have a tile for a piece of a room, or an entire room
    // which may have 2 exits/entrances, which connect to different tiles
    // we won't keep an entire level in memory at once, only the current tile and its immediate connections
    this.tiles = []
  }
}

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

class Block {
  constructor() {
    this.canWalk = false
    this.canSeeThrough = false
    this.canShootThrough = false
    this.texture = null
  }

  onLoad() {
    // placeholder
  }

  onUnload() {
    // placeholder
  }

  onEnter() {
    // placeholder
  }

  onLeave() {
    // placeholder
  }
}