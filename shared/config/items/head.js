import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
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
            [ItemAttributeType.Defense]: 10,
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
      [ItemAttributeType.Defense]: 20,
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
      [ItemAttributeType.Defense]: 15,
      [ItemAttributeType.ColdResist]: 50,
      [ItemAttributeType.ColdDamage]: 15,
    },
  }),
]
