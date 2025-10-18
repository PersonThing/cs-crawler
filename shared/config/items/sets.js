import { Abilities, AbilityModifiers } from '../abilities/abilities.js'
import ItemAttributeType from '../item-attribute-type.js'

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
          [ItemAttributeType.Health]: 100,
          [ItemAttributeType.LifePerHit]: 50,
        },
        abilities: [Abilities.Fireball.id],
        abilityModifiers: []
      },
      // 3 items
      {
        attributes: {
          [ItemAttributeType.MaxPets]: 2, // you can have 2 more pets out at a time
          [ItemAttributeType.MaxAbilityModifiers]: 2,
        },
        abilities: [],
        abilityModifiers: [AbilityModifiers.Pet.id]
      },
    ],
  },
}

export default ItemSet
