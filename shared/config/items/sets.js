import { AbilityModifiers } from '../abilities/abilities.js'
import ItemAttribute from '../item-attribute.js'

const ItemSet = {
  Eebeeb: {
    id: 'Eebeeb',
    name: "Eebeeb's Glory",
    bonuses: [
      // 1 item
      {
        attributes: {},
        abilities: [],
        abilityModifiers: []
      },
      // 2 items
      {
        attributes: {
          [ItemAttribute.Health]: 100,
          [ItemAttribute.LifePerHit]: 50,
        },
        abilities: ['Fireball'],
        abilityModifiers: []
      },
      // 3 items
      {
        attributes: {
          [ItemAttribute.MaxPets]: 2, // you can have 2 more pets out at a time
          [ItemAttribute.MaxAbilityModifiers]: 2,
        },
        abilities: [],
        abilityModifiers: ['Pet']
      },
    ],
  },
}

export default ItemSet
