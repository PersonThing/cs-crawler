import { Textures } from '#shared/config/textures.js'

const level1 = {
  texturePath: '/assets/wfc-textures/wfc1.bmp',
  blocks: {
    '#000000': {
      textures: [Textures.tiles.rocks],
      canWalk: false,
    },
    '#ffffff': {
      textures: [Textures.tiles.gravel],
      canWalk: true,
    },
    '#e0e0e0': {
      textures: [Textures.tiles.gravel, Textures.object.mushroom],
      canWalk: true,
    },
  },
}

export { level1 }
