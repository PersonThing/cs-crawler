import { Textures } from '#shared/config/textures.js'
import Block from './config/block.js'
import { ART_SCALE } from './config/constants.js'
import Level from './config/level.js'
import Tile from './config/tile.js'
import Tiles from './level-builder-tiles.js'

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

const generateLevel = async () => {
  const level = new Level()

  const notWalkableTiles = [1,2]
  const t = (config) => {
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
    [
      t(Tiles.MushRoom),
      t(Tiles.TestRoom),
    ],
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
    [
      t(Tiles.DoorRightTop),
      t(Tiles.DoorLeftRightTop),
      t(Tiles.HallwayHorizontal),
      t(Tiles.DoorLeftTopBottom),
    ],
    [null, null, null, t(Tiles.HallwayVertical)],
    [
      null,
      null,
      null,
      t(Tiles.DoorRightTop),
      t(Tiles.HallwayHorizontal),
      t(Tiles.DoorLeftRightBottom),
      t(Tiles.DoorLeft),
    ],
    [null, null, null, null, null, t(Tiles.DoorTop)],
  ]

  level.start = {
    x: 200 * ART_SCALE,
    y: 200 * ART_SCALE,
  }

  return level
}

export default generateLevel