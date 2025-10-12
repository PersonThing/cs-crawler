import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'
import ItemSet from './sets.js'

export const feetItems = [
  ...Object.keys(Textures.inventory.feet).map(
    textureKey =>
      new Item({
        name: textureKey,
        itemType: ItemType.Feet,
        itemQuality: ItemQuality.Normal,
        inventoryTexture: Textures.inventory.feet[textureKey],
        attributes: {
          [ItemAttributeType.Defense]: 5,
          [ItemAttributeType.MovementSpeedPercent]: 20,
        },
      })
  ),

  // Set feet
  new Item({
    name: 'Eebeeb\'s Boots',
    itemType: ItemType.Feet,
    itemQuality: ItemQuality.Set,
    setId: ItemSet.Eebeeb.id,
    inventoryTexture: Textures.inventory.feet.platedboots,
    attributes: {
      [ItemAttributeType.Defense]: 25,
      [ItemAttributeType.MovementSpeedPercent]: 50,
    },
  }),
]