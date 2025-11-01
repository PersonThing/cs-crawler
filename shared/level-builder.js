import { Textures } from '#shared/config/textures.js'
import Block from './config/block.js'
import { ART_SCALE, BLOCK_SIZE } from './config/constants.js'
import Level from './config/level.js'
import Tile from './config/tile.js'
import Tiles from './level-builder-tiles.js'
import { EnemyTypes } from './config/enemies.js'

const textureMap = {
  0: null,
  1: Textures.tiles.stone,
  2: Textures.tiles.rocks,
  3: Textures.tiles.gravel,
  4: Textures.object.mushroom,
  5: Textures.particle.fire1,
  6: Textures.particle.fire2,
  7: Textures.tiles.grass,
  8: Textures.tiles.dirt,
  9: Textures.tiles.sprouts,
  10: Textures.object.bush,
  11: Textures.tiles.water,
}

// Helper function to find a walkable position within a tile
function findWalkablePositionInTile(tile, tileX, tileY) {
  // Get tile dimensions from blockGrid
  const tileHeight = tile.blockGrid.length
  if (tileHeight === 0) return null

  // Find the actual width by checking the first non-empty row
  let tileWidth = 0
  for (let y = 0; y < tileHeight; y++) {
    if (tile.blockGrid[y] && tile.blockGrid[y].length > tileWidth) {
      tileWidth = tile.blockGrid[y].length
    }
  }
  if (tileWidth === 0) return null

  const tileWorldX = tileX * tileWidth * BLOCK_SIZE
  const tileWorldY = tileY * tileHeight * BLOCK_SIZE

  // First, collect all walkable positions
  const walkablePositions = []
  for (let localY = 0; localY < tileHeight; localY++) {
    for (let localX = 0; localX < tileWidth; localX++) {
      const block = tile.blockGrid[localY] && tile.blockGrid[localY][localX]
      if (block && block.canWalk) {
        walkablePositions.push({
          localX,
          localY,
          x: (tileWorldX + localX * BLOCK_SIZE + BLOCK_SIZE / 2) * ART_SCALE,
          y: (tileWorldY + localY * BLOCK_SIZE + BLOCK_SIZE / 2) * ART_SCALE,
        })
      }
    }
  }

  // Return a random walkable position if any exist
  if (walkablePositions.length > 0) {
    const randomIndex = Math.floor(Math.random() * walkablePositions.length)
    return walkablePositions[randomIndex]
  }

  return null // No walkable position found
}

const generateLevel = async () => {
  const level = new Level()

  const notWalkableTiles = [0, 1, 2] // 0=null, 1=stone, 2=rocks are not walkable
  const t = config => {
    const tile = new Tile(config.label)
    config.grid.forEach((row, y) => {
      row.forEach((n, x) => {
        const isWalkable = !notWalkableTiles.includes(n)
        const textures = n.length ? n.map(t => textureMap[t]) : [textureMap[n]]
        tile.setBlock(
          new Block({
            x,
            y,
            canWalk: isWalkable,
            canSeeThrough: isWalkable,
            canShootThrough: isWalkable,
            textures,
          })
        )
      })
    })
    return tile
  }

  level.tileGrid = [
    [t(Tiles.MushRoom), t(Tiles.TestRoom)],
    [
      t(Tiles.DoorRightTopBottom),
      t(Tiles.DoorLeftRightTop),
      t(Tiles.DoorLeftRightBottom),
      t(Tiles.HallwayHorizontal),
      t(Tiles.HallwayHorizontal),
      t(Tiles.DoorLeftBottom),
    ],
    [
      t(Tiles.DoorRightTopBottom),
      t(Tiles.DoorLeftRightBottom),
      t(Tiles.DoorLeftTop),
      t(Tiles.DoorRightBottom),
      t(Tiles.HallwayHorizontal),
      t(Tiles.DoorLeftTop),
    ],
    [t(Tiles.DoorRightTop), t(Tiles.DoorLeftRightTop), t(Tiles.HallwayHorizontal), t(Tiles.DoorLeftTopBottom)],
    [null, null, null, t(Tiles.HallwayVertical)],
    [null, null, null, t(Tiles.DoorRightTop), t(Tiles.HallwayHorizontal), t(Tiles.DoorLeftRightBottom), t(Tiles.DoorLeft)],
    [null, null, null, null, null, t(Tiles.DoorTop)],
  ]

  level.start = {
    x: 200 * ART_SCALE,
    y: 200 * ART_SCALE,
  }

  // Generate enemy spawn points for each tile (1 enemy per walkable block)
  level.enemySpawns = []
  level.tileGrid.forEach((row, tileY) => {
    row.forEach((tile, tileX) => {
      if (!tile) return // Skip null tiles
      if (tileX === 0 && tileY === 0) return // Skip first tile

      // Generate 0-5 enemies per tile
      const enemyCount = Math.floor(Math.random() * 6) // 0 to 5 enemies

      for (let i = 0; i < enemyCount; i++) {
        // Find a walkable position within the tile
        const spawnPosition = findWalkablePositionInTile(tile, tileX, tileY)
        if (spawnPosition) {
          // Randomly choose enemy type
          const enemyTypes = Object.keys(EnemyTypes)
          const randomEnemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]

          level.enemySpawns.push({
            enemyType: randomEnemyType,
            x: spawnPosition.x,
            y: spawnPosition.y,
            tileX,
            tileY,
          })
        }
      }
    })
  })

  return level
}

export default generateLevel
