import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'
import ItemSet from './sets.js'

export const handsItems = [
  ...Object.keys(Textures.inventory.hands).map(
    textureKey =>
      new Item({
        name: textureKey,
        itemType: ItemType.Hands,
        itemQuality: ItemQuality.Normal,
        inventoryTexture: Textures.inventory.hands[textureKey],
        attributes: {
          [ItemAttributeType.Defense]: 5,
        },
      })
  ),

  // Set hands
  new Item({
    name: "Eebeeb's Fingers",
    itemType: ItemType.Hands,
    itemQuality: ItemQuality.Set,
    setId: ItemSet.Eebeeb.id,
    inventoryTexture: Textures.inventory.hands.platedgloves,
    attributes: {
      [ItemAttributeType.Defense]: 25,
      [ItemAttributeType.AttackSpeedPercent]: 50,
    },
  }),
]
