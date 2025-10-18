import Grid from './path-finding/Grid.js'
import Util from './path-finding/Util.js'
import AStarFinder from './path-finding/AStarFinder.js'
import { ART_SCALE, BLOCK_SIZE } from './config/constants.js'
// Most of this code is from the cs-builder project, and may need revision

class Pather {
  constructor(level) {
    this.level = level
    this.blockSize = BLOCK_SIZE * ART_SCALE
    this.smoothPathing = true

    // get tile size from first tile in grid
    const firstTile = this.level.tileGrid[0]?.[0]
    if (!firstTile) {
      throw new Error('Level has no tiles in tileGrid')
    }
    // compute grid width and height
    // each tile is 10x10 blocks
    // grid height computed from this.level.tileGrid.length
    // grid width computed from the longest row in this.level.tileGrid
    const tileWidth = firstTile.blockGrid[0].length
    const tileHeight = firstTile.blockGrid.length

    const height = this.level.tileGrid.length * tileHeight
    const width = this.level.tileGrid.reduce((max, row) => Math.max(max, row.length), 0) * tileWidth
    this.grid = new Grid(width, height)

    // loop tiles
    for (let tileY = 0; tileY < this.level.tileGrid.length; tileY++) {
      for (let tileX = 0; tileX < this.level.tileGrid[tileY].length; tileX++) {
        const tile = this.level.tileGrid[tileY][tileX]
        if (!tile) {
          continue
        }

        // loop blocks in tile and set walkable/visible
        for (let blockY = 0; blockY < tile.blockGrid.length; blockY++) {
          for (let blockX = 0; blockX < tile.blockGrid[blockY].length; blockX++) {
            const block = tile.blockGrid[blockY][blockX]
            this.grid.setWalkableAt(tileX * tileWidth + blockX, tileY * tileHeight + blockY, block.canWalk)
            this.grid.setVisibleAt(tileX * tileWidth + blockX, tileY * tileHeight + blockY, block.canSeeThrough)
          }
        }
      }
    }

    // render a xo grid in console, x=not walkable, o=walkable
    // for (let y = 0; y < this.grid.height; y++) {
    //   let row = ''
    //   for (let x = 0; x < this.grid.width; x++) {
    //     row += this.grid.isWalkableAt(x, y) ? 'o' : 'x'
    //   }
    //   console.log(row)
    // }

    this.finder = new AStarFinder({
      allowDiaganol: true,
      dontCrossCorners: true,
    })

    this.pathsComputed = true
  }

  findPath(from, to) {
    const [fromX, fromY] = this.toGridCoordinates(from.x, from.y)
    const [toX, toY] = this.toGridCoordinates(to.x, to.y)

    // find all points in a line between from and to
    // filter to only walkable points
    // loop walkable points backward, trying to find paths to them.  use the first path found.
    const lineBetween = Util.interpolate(fromX, fromY, toX, toY).filter(([x, y]) =>
      this.grid.isWalkableAt(x, y)
    )
    let path = null
    for (let i = lineBetween.length - 1; i >= 0; i--) {
      let [x, y] = lineBetween[i]
      path = this.finder.findPath(fromX, fromY, x, y, this.grid.clone())
      if (path.length > 0) break
    }
    if (path == null || path.length == 0) {
      return []
    }

    path = this.smoothPathing ? Util.smoothenPath(this.grid, path) : Util.compressPath(path)

    // remove the first point if it's the same as start
    if (path.length && path[0][0] == fromX && path[0][1] == fromY) {
      path.shift()
    }

    return path.map(([x, y]) => this.toGameCoordinates(x, y))
  }

  canSee(from, to) {
    const [startX, startY] = this.toGridCoordinates(from.x, from.y)
    const [goalX, goalY] = this.toGridCoordinates(to.x, to.y)
    const line = Util.interpolate(startX, startY, goalX, goalY)
    const allVisible = line.every(([x, y]) => this.grid.isVisibleAt(x, y))
    return allVisible
  }

  toGridCoordinates(x, y) {
    return [Math.floor(x / this.blockSize), Math.floor(y / this.blockSize)]
  }

  toGameCoordinates(x, y) {
    return {
      x: x * this.blockSize + this.blockSize / 2,
      y: y * this.blockSize + this.blockSize / 2,
    }
  }

  isWalkableAt(x, y) {
    const [gridX, gridY] = this.toGridCoordinates(x, y)
    return this.grid.isWalkableAt(gridX, gridY)
  }

  getBestAvailableItemPosition(position, currentGroundItems) {
    // TODO: make this better and respect obstacles


    // given a position {x, y}, return the best available position to place an item
    // where there isn't already an item within 20 pixels radius
    // ideally it drops it exactly at the passed position
    // failing that, look for the nearest position, circling clockwise and outward until a good position is found
    if (position == null || position.x == null || position.y == null) {
      return null
    }
    const radius = 30
    const step = 4
    const maxRadius = 200
    const maxSteps = maxRadius / step
    let bestPosition = position
    let bestDistance = 0
    let bestPositionFound = false
    for (let r = 0; r < maxSteps; r++) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const x = position.x + Math.cos(a) * r * step
        const y = position.y + Math.sin(a) * r * step
        const distance = Math.sqrt((x - position.x) ** 2 + (y - position.y) ** 2)
        if (distance < bestDistance) {
          continue
        }
        if (
          currentGroundItems.some(item => {
            const dx = item.position.x - x
            const dy = item.position.y - y
            return Math.sqrt(dx ** 2 + dy ** 2) < radius
          })
        ) {
          continue
        }
        bestPosition = { x, y }
        bestDistance = distance
        bestPositionFound = true
      }
      if (bestPositionFound) {
        break
      }
    }
    return bestPosition
  }
}

export default Pather
