import Level from './level'
import Tile from './tile'
import Block from './block'
import { Textures } from './textures'

export const generateSampleLevel = () => {
  const level = new Level()

  const createSampleTile = canWalkFunc => {
    const tile = new Tile()
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const canWalk = canWalkFunc(x, y)
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

  const doorSides = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // door on sides
      || (y === 4)
      || (y === 5)
  })

  const doorLeft = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // door on left
      || (x === 0) && (y == 4 || y == 5)
  })

  const doorSidesTop = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // door on sides
      || (y === 4)
      || (y === 5)
      // door on top
      || (y === 0) && (x == 4 || x == 5)
  })

  const doorRight = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // door on right
      || (x === 9) && (y == 4 || y == 5)
  })

  const doorLeftTop = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // door on top
      || (y === 0) && (x == 4 || x == 5)
      // door on left
      || (x === 0) && (y == 4 || y == 5)
  })

  const doorRightBottom = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // door on bottom
      || (y === 9) && (x == 4 || x == 5)
      // door on right
      || (x === 9) && (y == 4 || y == 5)
  })

  const doorLeftBottom = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // door on bottom
      || (y === 9) && (x == 4 || x == 5)
      // door on left
      || (x === 0) && (y == 4 || y == 5)
  })

  const doorAllSides = () => createSampleTile((x, y) => {
    return (x > 0 && x < 9 && y > 0 && y < 9)
      // grass doorway on all sides
      || (y === 4)
      || (y === 5)
      || (x === 4)
      || (x === 5)
  })

  level.tileGrid = [
    [doorRight(), doorSides(), doorLeftBottom()],
    [null, doorRightBottom(), doorLeftTop()],
    [doorRight(), doorSidesTop(), doorLeft()]
  ]

  return level
}
