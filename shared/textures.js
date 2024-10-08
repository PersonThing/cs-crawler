import { Assets } from 'pixi.js'

export const Textures = {
  player_base: '/assets/textures/player/activechar/base.png',
  grass: '/assets/textures/tiles/grass.png',
  stone: '/assets/textures/tiles/stone.png',
  bricks: '/assets/textures/tiles/perspective/brickwall_lr.png',
  bricks_top: '/assets/textures/tiles/perspective/bricks_top.png',
  weapons: {
    hands: '/assets/textures/player/activechar/item/weapon/hands.png',
    axe: '/assets/textures/player/activechar/item/weapon/axe.png',
    bow: '/assets/textures/player/activechar/item/weapon/bow.png',
    club: '/assets/textures/player/activechar/item/weapon/club.png',
    crossbow: '/assets/textures/player/activechar/item/weapon/crossbow.png',
    greatsword: '/assets/textures/player/activechar/item/weapon/greatsword.png',
    gun: '/assets/textures/player/activechar/item/weapon/gun.png',
    hatchet: '/assets/textures/player/activechar/item/weapon/hatchet.png',
    knife: '/assets/textures/player/activechar/item/weapon/knife.png',
    spear: '/assets/textures/player/activechar/item/weapon/spear.png',
    sword: '/assets/textures/player/activechar/item/weapon/sword.png',
  },
  armors: {
    base: '/assets/textures/player/activechar/item/helmet/armorbase.png',
    bascinet: '/assets/textures/player/activechar/item/helmet/bascinet.png',
    greathelm: '/assets/textures/player/activechar/item/helmet/greathelm.png',
    nasalhelm: '/assets/textures/player/activechar/item/helmet/nasalhelm.png',
    skullcap: '/assets/textures/player/activechar/item/helmet/skullcap.png',
    visorhelm: '/assets/textures/player/activechar/item/helmet/visorhelm.png',
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
