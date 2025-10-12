import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'

export const chestItems = [
  ...Object.keys(Textures.inventory.chest).map(
    textureKey =>
      new Item({
        name: textureKey,
        itemType: ItemType.Chest,
        itemQuality: ItemQuality.Normal,
        inventoryTexture: Textures.inventory.chest[textureKey],
        attributes: {
          [ItemAttributeType.Defense]: 10,
        },
      })
  ),

  // Rare chest items
  new Item({
    name: 'Ornate Armor',
    itemType: ItemType.Chest,
    itemQuality: ItemQuality.Rare,
    inventoryTexture: Textures.inventory.chest.ornatearmor,
    attributes: {
      [ItemAttributeType.Defense]: 25,
    },
  }),
]