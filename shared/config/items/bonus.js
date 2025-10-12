import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'

export const bonusItems = [
  // General bonus items
  ...Object.keys(Textures.inventory.item)
    .filter(textureKey => typeof Textures.inventory.item[textureKey] != 'object')
    .map(
      textureKey =>
        new Item({
          name: textureKey,
          itemType: ItemType.Bonus,
          itemQuality: ItemQuality.Normal,
          inventoryTexture: Textures.inventory.item[textureKey],
          attributes: {
            [ItemAttributeType.Defense]: 1,
            [ItemAttributeType.PhysicalDamage]: 1,
          },
        })
    ),

  // Gem bonus items
  ...Object.keys(Textures.inventory.item.gems).map(
    textureKey =>
      new Item({
        name: textureKey,
        itemType: ItemType.Bonus,
        itemQuality: ItemQuality.Normal,
        inventoryTexture: Textures.inventory.item.gems[textureKey],
        attributes: {
          [ItemAttributeType.Defense]: 1,
          [ItemAttributeType.PhysicalDamage]: 1,
        },
      })
  ),
]
