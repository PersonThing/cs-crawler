import { Assets } from 'pixi.js'

export const Textures = {
  PlayerBase: '/assets/player_base.png',
  Grass: '/assets/grass.png',
  Stone: '/assets/stone.png',
}

export const preloadTextures = () => {
  const promises = Object.values(Textures).map((texture) => Assets.load(texture))
  return Promise.all(promises)
}