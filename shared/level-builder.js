import Level from "./level"
import Tile from "./tile"
import Block from "./block"

export const generateSampleLevel = () => {
  const level = new Level()

  const tile1 = new Tile()

  // create a tile that's just a 20x20 grid of grass blocks
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 20; y++) {
      tile1.setBlock(new Block({
        canWalk: true,
        canSeeThrough: true,
        canShootThrough: true,
        texture: '/assets/grass.png'
      }))
    }
  }

  level.tiles = [
    // need to decide data structure for tiles, but for now just to get rendering working, we'll use a single tile in an array
    tile1
  ]

  return level
}
