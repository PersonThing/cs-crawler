// using wave function collapse method to generate level

import { ART_SCALE, BLOCK_SIZE } from './config/constants.js'
import Block from './config/block.js'
import Level from './config/level.js'
import Tile from './config/tile.js'
import wfc from 'wavefunctioncollapse'

const LEVEL_WIDTH = 50
const LEVEL_HEIGHT = 50

function componentToHex(c) {
  var hex = c.toString(16)
  return hex.length == 1 ? '0' + hex : hex
}

function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

async function getSampleData(imagePath) {
  return new Promise((resolve, reject) => {
    // create an image element and load the sample image
    const img = new Image()

    img.onload = () => {
      // create a canvas and draw the loaded image onto it
      const sampleCanvas = document.createElement('canvas')
      const sampleContext = sampleCanvas.getContext('2d')

      // set canvas size to match the image
      sampleCanvas.width = img.width
      sampleCanvas.height = img.height

      // draw the image onto the canvas
      sampleContext.drawImage(img, 0, 0)

      // get the image data and resolve the promise
      const imageData = sampleContext.getImageData(0, 0, img.width, img.height)
      resolve(imageData)
    }

    img.onerror = error => {
      reject(new Error(`Failed to load image: ${imagePath}. ${error}`))
    }

    // start loading the image
    img.src = imagePath
  })
}

async function generateLevel(wfcLevel) {
  // run WFC on that sample to generate a larger texture
  const sampleData = await getSampleData(wfcLevel.texturePath)
  const model = new wfc.OverlappingModel(
    sampleData.data,
    sampleData.width,
    sampleData.height,
    5, // N size
    LEVEL_WIDTH, // output width
    LEVEL_HEIGHT, // output height
    true, // periodic input
    true, // periodic output
    2, // symmetry
    false // ground
  )
  let attempts = 0
  while (attempts < 10 && !model.generate(Math.random)) {
    attempts++
    if (attempts < 10) {
      console.warn('WFC generation failed, trying again')
    } else {
      throw new Error('WFC generation failed after multiple attempts, try changing OverlappingModel config for this level or adjust the input texture')
    }
  }
  const outputCanvas = document.createElement('canvas')
  const outputCanvasContext = outputCanvas.getContext('2d')
  const outputImgData = outputCanvasContext.createImageData(LEVEL_WIDTH, LEVEL_HEIGHT)
  model.graphics(outputImgData.data)

  // make a level with a single tile for now
  const tile = new Tile('GeneratedTile')

  // loop x and y axes and set blocks from generated image
  let startingPosition = null

  for (let x = 0; x < LEVEL_WIDTH; x++) {
    for (let y = 0; y < LEVEL_HEIGHT; y++) {
      // get pixel color at this x, y position
      const pixelIndex = (y * LEVEL_WIDTH + x) * 4
      const r = outputImgData.data[pixelIndex]
      const g = outputImgData.data[pixelIndex + 1]
      const b = outputImgData.data[pixelIndex + 2]
      const hexColor = rgbToHex(r, g, b)
      let blockDefinition = wfcLevel.blocks[hexColor]
      if (!blockDefinition) {
        console.warn('hexColor not found in wfc level definition: ', hexColor)
        blockDefinition = Object.values(wfcLevel.blocks)[0] // default to empty block
      }
      tile.setBlock(
        new Block({
          x,
          y,
          canWalk: blockDefinition.canWalk,
          canSeeThrough: blockDefinition.canSeeThrough,
          canShootThrough: blockDefinition.canShootThrough,
          textures: blockDefinition.textures,
        })
      )
      if (blockDefinition.canWalk && startingPosition == null) {
        startingPosition = { x, y }
      }
    }
  }

  const level = new Level()
  level.tileGrid = [[tile]]
  if (startingPosition) {
    level.start = {
      x: startingPosition.x * BLOCK_SIZE * ART_SCALE, // TODO: art_scale shouldn't be factored in to model..
      y: startingPosition.y * BLOCK_SIZE * ART_SCALE,
    }
  }
  return level
}

export default generateLevel
