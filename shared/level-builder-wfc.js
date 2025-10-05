// using wave function collapse method to generate level

import { ART_SCALE } from './constants.js';
import { Textures } from '../client/src/textures.js'
import Block from './block.js';
import Level from './level.js';
import Tile from './tile.js'
import wfc from 'wavefunctioncollapse'

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

const colorMap = {
  0: '#000000',
  1: '#ff0000',
  2: '#00ff00',
  3: '#0000ff',
  4: '#ffff00',
  5: '#ff00ff',
  6: '#00ffff',
}

const textureMap = {
  0: null,
  1: Textures.tiles.rocks,
  2: Textures.tiles.stone,
  3: Textures.tiles.gravel,
  4: Textures.object.mushroom,
  5: Textures.particle.fire1,
  6: Textures.particle.fire2,
}

function generateLevel() {
  const room = [
    [3, 3, 3, 2, 3, 3, 3, 3],
    [3, 3, 3, 2, 3, 3, 3, 3],
    [2, 2, 2, 2, 2, 2, 2, 3],
    [1, 1, 1, 2, 1, 1, 1, 3],
    [3, 3, 3, 1, 3, 3, 3, 3],
    [3, 3, 3, 3, 3, 3, 3, 3],
    [3, 3, 3, 3, 3, 3, 3, 3],
    [3, 3, 3, 3, 3, 3, 3, 3],
  ]

  const sampleCanvas = document.createElement('canvas')
  const sampleContext = sampleCanvas.getContext('2d')
  for (let y = 0; y < room.length; y++) {
    for (let x = 0; x < room[y].length; x++) {
      sampleContext.fillStyle = colorMap[room[y][x]]
      sampleContext.fillRect(x, y, 1, 1)
    }
  }

  const sampleData = sampleContext.getImageData(0, 0, 10, 10)
  const model = new wfc.OverlappingModel(
    sampleData.data,
    sampleData.width,
    sampleData.height,
    3,
    100,
    100,
    true,
    true,
    1
  )
  model.generate(Math.random)
  const outputCanvas = document.createElement('canvas')
  const outputCanvasContext = outputCanvas.getContext('2d')
  const outputImgData = outputCanvasContext.createImageData(100, 100)
  model.graphics(outputImgData.data)
  
  // slice the output into 10x10 tiles
  let startingX = 0
  let startingY = 0
  
  const grid = []
  for (let tiley = 0; tiley < 100; tiley += 10) {
    const tilerow = []
    for (let tilex = 0; tilex < 100; tilex += 10) {
      const tile = new Tile(`${tilex},${tiley}`)
      for (let blocky = 0; blocky < 10; blocky++) {
        for (let blockx = 0; blockx < 10; blockx++) {
          const index = (tiley + blocky) * 100 * 4 + (tilex + blockx) * 4
          const r = outputImgData.data[index]
          const g = outputImgData.data[index + 1]
          const b = outputImgData.data[index + 2]
          const hexColor = rgbToHex(r, g, b)
          let n = 0
          Object.entries(colorMap).forEach(([key, value]) => {
            if (value === hexColor) {
              n = key
            }
          })
          const block = makeBlock(n, blockx, blocky)
          tile.setBlock(block)
          if (block.canWalk && startingX == null) {
            startingX = tilex + blockx
            startingY = tiley + blocky
          }
        }
      }
      tilerow.push(tile)
    }
    grid.push(tilerow)
  }
  const level = new Level()
  level.tileGrid = grid

  // get first valid walkable block, use that as start position
  level.start = {
    x: startingX * ART_SCALE,
    y: startingY * ART_SCALE,
  }
  return level
}

function makeBlock(n, x, y) {
  const isWalkable = n === 3 || n.length
  const textures = n.map ? n.map(t => textureMap[t]) : [textureMap[n]]
  return new Block({
    x,
    y,
    canWalk: isWalkable,
    canSeeThrough: isWalkable,
    canShootThrough: isWalkable,
    textures,
  })
}

export default generateLevel
