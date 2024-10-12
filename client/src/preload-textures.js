import { Assets } from 'pixi.js'
import { Textures } from './textures.js'

const preloadTextures = (textures) => {
  if (textures == null) {
    textures = Textures
  }
  const promises = Object.keys(textures).map((key) => {
    if (typeof textures[key] === 'object' && textures[key] != null) {
      return preloadTextures(textures[key])
    }
    return Assets.load(textures[key])
  })
  return Promise.all(promises)
}

export default preloadTextures