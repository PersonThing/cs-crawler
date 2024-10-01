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

  render(stage) {
    // render all tiles
    this.tiles.forEach((tile) => {
      this.renderTile(tile, stage)
    })
  }

  renderTile(tile, stage) {
    console.log('rendering tile', tile)
    tile.blocks.forEach((block) => {
      if (block.texture) {
        const sprite = new PIXI.Sprite.from(block.texture)
        sprite.x = block.x * 32
        sprite.y = block.y * 32
        stage.addChild(sprite)
      }
    })
  }
}

export default Level
