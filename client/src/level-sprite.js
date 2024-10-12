import { Container, Sprite, Graphics, Text } from 'pixi.js'
import { ART_SCALE, BLOCK_SIZE, DEBUG } from '../../shared/constants.js'

const partialRevealDistance = 400
const fullRevealDistance = 200

class LevelSprite extends Container {
  constructor(level, mapScale, isMinimap) {
    super()
    this.level = JSON.parse(JSON.stringify(level))
    this.mapScale = mapScale
    this.blockSize = BLOCK_SIZE * this.mapScale * ART_SCALE
    this.tileSize = this.blockSize * 10
    this.isMinimap = isMinimap
    this.tileContainer = new Container()
    this.addChild(this.tileContainer)
  }

  onTick(localPlayer, maxWidth, maxHeight) {
    if (localPlayer == null) return

    // only render the tiles around the local player
    // figure out which tile the local player is inside
    const playerTileX = Math.floor(
      (localPlayer.x * this.mapScale) / this.tileSize
    )
    const playerTileY = Math.floor(
      (localPlayer.y * this.mapScale) / this.tileSize
    )

    // compute the bounds of the screen in tiles
    const numTilesWide = Math.ceil(maxWidth / this.tileSize)
    const numTilesHigh = Math.ceil(maxHeight / this.tileSize)

    // how many tiles around the player to render
    const renderWidth = Math.ceil(numTilesWide / 2)
    const renderHeight = Math.ceil(numTilesHigh / 2)

    // this could be optimized
    this.level.tileGrid.forEach((tileRow, tileY) => {
      tileRow.forEach((tile, tileX) => {
        if (!tile) return

        // if tile is NOT around player's current tile, unrender it
        if (
          tile.rendered &&
          (Math.abs(tileX - playerTileX) > renderWidth ||
            Math.abs(tileY - playerTileY) > renderHeight)
        ) {
          this.unrenderTile(tile)
        }

        // if tile is around player's current tile, make sure it's rendered
        if (
          Math.abs(tileX - playerTileX) <= renderWidth &&
          Math.abs(tileY - playerTileY) <= renderHeight
        ) {
          if (!tile.rendered) {
            tile.container = new Container()
            tile.container.filters = this.tileFilters
            tile.container.x = tileX * this.tileSize
            tile.container.y = tileY * this.tileSize

            tile.blockGrid.forEach((blockRow) => {
              blockRow
                .filter((b) => b.texture != null)
                .forEach((block) => {
                  if (this.isMinimap) {
                    if (block.canWalk) {
                      // dont draw anything for walkable areas
                      return
                    }

                    const blockGraphic = new Graphics()
                    blockGraphic.x = block.x * this.blockSize
                    blockGraphic.y = block.y * this.blockSize
                    blockGraphic.alpha = block.alpha
                    blockGraphic
                      .rect(0, 0, this.blockSize, this.blockSize)
                      .fill(0xffffff)
                    block.sprite = blockGraphic
                    tile.container.addChild(blockGraphic)
                  } else {
                    const blockSprite = Sprite.from(block.texture)
                    blockSprite.x = block.x * this.blockSize
                    blockSprite.y = block.y * this.blockSize
                    blockSprite.scale.set(this.mapScale * ART_SCALE)
                    blockSprite.alpha = block.alpha
                    block.sprite = blockSprite
                    tile.container.addChild(blockSprite)
                  }
                })
            })

            if (DEBUG) {
              // draw coords and blue box around tile if debug mode on
              const graphic = new Graphics()
              graphic.rect(0, 0, this.tileSize, this.tileSize)
              graphic.stroke(0x0000ff)
              tile.container.addChild(graphic)

              const text = new Text({
                text: `${tile.container.x},${tile.container.y}`,
                style: {
                  fontFamily: 'Arial',
                  fontSize: 8,
                  fill: 0x00ff00,
                  align: 'center',
                  dropShadow: true,
                  dropShadowDistance: 1,
                  dropShadowBlur: 1,
                  dropShadowAlpha: 1,
                },
              })
              tile.container.addChild(text)
            }

            this.tileContainer.addChild(tile.container)
            tile.rendered = true
          }

          // update visibility of blocks based on whether the player has discovered them or not
          this.updateBlockVisibility(localPlayer, tile)
        }
      })
    })
  }

  unrenderTile(tile) {
    if (!tile.rendered) return

    this.tileContainer.removeChild(tile.container)
    delete tile.container
    tile.rendered = false
  }

  updateBlockVisibility(localPlayer, tile) {
    // return
    tile.blockGrid.forEach((blockRow) => {
      blockRow
        .filter((b) => b.sprite != null)
        .forEach((block) => {
          const dx =
            tile.container.x + block.sprite.x - localPlayer.x * this.mapScale
          const dy =
            tile.container.y + block.sprite.y - localPlayer.y * this.mapScale

          // if block.sprite is within 200px of the player, set it to discovered
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < fullRevealDistance * this.mapScale) {
            block.alpha = 1
            block.sprite.alpha = 1
          } else if (distance < partialRevealDistance * this.mapScale && block.sprite.alpha < 1) {
            block.alpha = 0.5
            block.sprite.alpha = 0.5
          }
        })
    })
  }
}

export default LevelSprite
