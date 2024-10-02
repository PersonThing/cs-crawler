import Level from './level'
import Tile from './tile'
import Block from './block'
import { Textures } from './textures'

export const generateSampleLevel = (stage) => {
  const level = new Level(stage)

  const makeTile = ({ left, right, top, bottom }) => {
    const tile = new Tile()
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const canWalk =
          // grass in the middle
          (x > 0 && x < 9 && y > 0 && y < 9) ||
          // door options
          (left && y > 2 && y < 7 && x === 0) ||
          (right && y > 2 && y < 7 && x === 9) ||
          (top && x > 2 && x < 7 && y === 0) ||
          (bottom && x > 2 && x < 7 && y === 9)

        tile.setBlock(
          new Block({
            x,
            y,
            canWalk,
            canSeeThrough: canWalk,
            canShootThrough: canWalk,
            texture: canWalk ? Textures.Grass : Textures.Stone,
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
