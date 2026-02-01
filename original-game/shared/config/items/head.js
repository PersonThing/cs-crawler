import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttribute from '../item-attribute.js'
import { Textures } from '#shared/config/textures.js'

export const headItems = [
  ...Object.keys(Textures.inventory.head)
    .filter(textureKey => textureKey != 'ornatehelm')
    .map(
      textureKey =>
        new Item({
          name: textureKey,
          itemType: ItemType.Head,
          itemQuality: ItemQuality.Normal,
          inventoryTexture: Textures.inventory.head[textureKey],
          equippedTexture: Textures.item.head[textureKey],
          attributes: {
            [ItemAttribute.Defense]: 10,
          },
        })
    ),

  // Rare head items
  new Item({
    name: 'Ornate Helm',
    itemType: ItemType.Head,
    itemQuality: ItemQuality.Rare,
    inventoryTexture: Textures.inventory.head.ornatehelm,
    equippedTexture: Textures.item.head.ornatehelm,
    attributes: {
      [ItemAttribute.Defense]: 20,
    },
  }),

  // Special head items
  new Item({
    name: 'Frozen Crown',
    itemType: ItemType.Head,
    itemQuality: ItemQuality.Special,
    inventoryTexture: Textures.inventory.head.crown,
    equippedTexture: Textures.item.head.crown,
    attributes: {
      [ItemAttribute.Defense]: 15,
      [ItemAttribute.ColdResist]: 50,
      [ItemAttribute.ColdDamage]: 15,
    },
  }),
]
