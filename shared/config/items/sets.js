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
        [ItemAttributeType.Lightning]: 1, // grants lightning spell
      },
      // 3 items
      {
        [ItemAttributeType.Pet]: 1, // grants spell modifier to summon a pet that fights for you
        [ItemAttributeType.MaxPets]: 2, // you can have 2 more pets out at a time
        [ItemAttributeType.LifePerHit]: 50,
      },
    ],
  },
}

export default ItemSet
