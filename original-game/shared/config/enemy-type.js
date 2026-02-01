import ItemAttribute from './item-attribute.js'
import { Textures } from './textures.js'

const EnemyType = {
  burning_zombie: {
    name: 'Burning Zombie',
    texture: Textures.entity.hostile.burning_zombie.bzombie,
    color: 0x4d7c47,
    maxHealth: 2000,
    maxSpeed: 150,
    baseStats: {
      [ItemAttribute.Damage]: 15,
      [ItemAttribute.Defense]: 5,
    },
    defaultInventory: [],
  },

  burning_skeleton: {
    name: 'Burning Skeleton',
    texture: Textures.entity.hostile.burning_skeleton.bskeleton,
    color: 0x8b7355,
    maxHealth: 1600,
    maxSpeed: 200,
    baseStats: {
      [ItemAttribute.Damage]: 12,
      [ItemAttribute.Defense]: 3,
      [ItemAttribute.CriticalChance]: 0.15,
    },
    defaultInventory: [],
  },
}

export default EnemyType
