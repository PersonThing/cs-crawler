import { Assets } from 'pixi.js'

export const Textures = {
  PlayerBase: '/assets/textures/player/warrior/base/player_front.png',
  Grass: '/assets/textures/tiles/grass.png',
  Stone: '/assets/textures/tiles/stone.png',
  Bricks: '/assets/textures/tiles/bricks.png',
  BricksTop: '/assets/textures/tiles/bricks_top.png',
}

export const preloadTextures = () => {
  const promises = Object.values(Textures).map((texture) => Assets.load(texture))
  return Promise.all(promises)
}