import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttribute from '../item-attribute.js'
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
          [ItemAttribute.Defense]: 5,
          [ItemAttribute.MovementSpeedPercent]: 20,
        },
      })
  ),

  // Set feet
  new Item({
    name: "Eebeeb's Boots",
    itemType: ItemType.Feet,
    itemQuality: ItemQuality.Set,
    setId: ItemSet.Eebeeb.id,
    inventoryTexture: Textures.inventory.feet.platedboots,
    attributes: {
      [ItemAttribute.Defense]: 25,
      [ItemAttribute.MovementSpeedPercent]: 50,
    },
  }),
]
