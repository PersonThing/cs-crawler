import { Textures } from './textures.js'
import Block from './block.js'
import Level from './level.js'
import Tile from './tile.js'

export const generateSampleLevel = (stage) => {
  const level = new Level(stage)

  const grassBlockConfig = {
    canWalk: true,
    canSeeThrough: true,
    canShootThrough: true,
    texture: Textures.Grass,
  }

  const stoneBlockConfig = {
    canWalk: false,
    canSeeThrough: false,
    canShootThrough: false,
    texture: Textures.Stone,
  }

  const makeTile = ({ left, right, top, bottom }) => {
    const tile = new Tile()
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        // grass anywhere that's walkable, stone otherwise
        const config =
          // open middle area
          (x > 0 && x < 9 && y > 0 && y < 9) ||
          // passages
          (left && y > 2 && y < 7 && x === 0) ||
          (right && y > 2 && y < 7 && x === 9) ||
          (top && x > 2 && x < 7 && y === 0) ||
          (bottom && x > 2 && x < 7 && y === 9)
          ? grassBlockConfig
          : stoneBlockConfig

        tile.setBlock(
          new Block({
            x,
            y,
            ...config
          })
        )
      }
    }
    return tile
  }

  level.tileGrid = [
    [
      makeTile({ right: true }),
      makeTile({ left: true, right: true }),
      makeTile({ left: true, bottom: true }),
    ],
    [
      null,
      makeTile({ right: true, bottom: true }),
      makeTile({ left: true, top: true }),
      makeTile({ right: true, bottom: true }),
      makeTile({ left: true }),
    ],
    [
      makeTile({ right: true }),
      makeTile({ right: true, left: true, top: true }),
      makeTile({ right: true, left: true }),
      makeTile({ left: true, top: true, bottom: true }),
    ],
    [
      null,
      null,
      null,
      makeTile({ top: true, right: true }),
      makeTile({ left: true, right: true }),
      makeTile({ left: true }),
    ],
  ]

  return level
}
