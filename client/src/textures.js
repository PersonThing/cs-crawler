import { Assets } from 'pixi.js'

export const Textures = {
  player: {
    base: '/assets/textures/player/base.png',
  },
  tiles: {
    grass: '/assets/textures/tiles/grass.png',
    stone: '/assets/textures/tiles/stone.png',
    dirt: '/assets/textures/tiles/dirt.png',
    gravel: '/assets/textures/tiles/gravel.png',
    blackstone: '/assets/textures/tiles/blackstone.png',
    bricks: '/assets/textures/tiles/bricks.png',
    rocks: '/assets/textures/tiles/rocks.png',
  },
  weapons: {
    hands: '/assets/textures/item/weapon/hands.png',
    axe: '/assets/textures/item/weapon/axe.png',
    bow: '/assets/textures/item/weapon/bow.png',
    club: '/assets/textures/item/weapon/club.png',
    crossbow: '/assets/textures/item/weapon/crossbow.png',
    greatsword: '/assets/textures/item/weapon/greatsword.png',
    gun: '/assets/textures/item/weapon/gun.png',
    hatchet: '/assets/textures/item/weapon/hatchet.png',
    knife: '/assets/textures/item/weapon/knife.png',
    spear: '/assets/textures/item/weapon/spear.png',
    sword: '/assets/textures/item/weapon/sword.png',
  },
  armors: {
    bascinet: '/assets/textures/item/helmet/bascinet.png',
    bascinet: '/assets/textures/item/helmet/crown.png',
    greathelm: '/assets/textures/item/helmet/greathelm.png',
    nasalhelm: '/assets/textures/item/helmet/nasalhelm.png',
    nasalhelm: '/assets/textures/item/helmet/ornatehelm.png',
    skullcap: '/assets/textures/item/helmet/skullcap.png',
    visorhelm: '/assets/textures/item/helmet/visorhelm.png',
  }
}

export const preloadTextures = (textures) => {
  if (textures == null) textures = Textures
  const promises = Object.values(textures).map((texture) => {
    if (typeof texture === 'object') {
      return preloadTextures(texture)
    }
    return Assets.load(texture)
  })
  return Promise.all(promises)
}
