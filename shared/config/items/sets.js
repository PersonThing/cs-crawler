import { Abilities, AbilityModifiers } from '../abilities.js'
import ItemAttributeType from '../item-attribute-type.js'

const ItemSet = {
  Eebeeb: {
    id: 'Eebeeb',
    name: "Eebeeb's Glory",
    bonuses: [
      // 1 item
      {},
      // 2 items
      {
        [ItemAttributeType.Health]: 100,
        [ItemAttributeType.LifePerHit]: 50,
        [ItemAttributeType.GrantAbility]: Abilities.Fireball.id,
      },
      // 3 items
      {
        [ItemAttributeType.GrantAbilityModifier]: AbilityModifiers.Pet.id,
        [ItemAttributeType.MaxAbilityModifiers]: 2,
        [ItemAttributeType.MaxPets]: 2, // you can have 2 more pets out at a time
      },
    ],
  },
}

export default ItemSet
