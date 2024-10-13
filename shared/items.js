import Item from './item.js'
import ItemType from './item-type.js'
import ItemQuality from './item-quality.js'
import ItemAttributeType from './item-attribute-type.js'
import { Textures } from '../client/src/textures.js'

export const SampleItems = [
  ...Object.keys(Textures.inventory.chest).map(textureKey => new Item({
    name: `Sample Chest ${textureKey}`,
    itemType: ItemType.Chest,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.chest[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 15
    }
  })),

  ...Object.keys(Textures.inventory.hands).map(textureKey => new Item({
    name: `Sample Hands ${textureKey}`,
    itemType: ItemType.Hands,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.hands[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 5
    }
  })),

  ...Object.keys(Textures.inventory.feet).map(textureKey => new Item({
    name: `Sample Feet ${textureKey}`,
    itemType: ItemType.Feet,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.feet[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 8
    }
  })),

  ...Object.keys(Textures.inventory.head).map(textureKey => new Item({
    name: `Sample Head ${textureKey}`,
    itemType: ItemType.Head,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.head[textureKey],
    equippedTexture: Textures.item.head[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 10
    }
  })),

  ...Object.keys(Textures.inventory.one_handed).filter(textureKey => Textures.item.weapon[textureKey] != null).map(textureKey => new Item({
    name: `Sample Weapon ${textureKey}`,
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.one_handed[textureKey],
    equippedTexture: Textures.item.weapon[textureKey],
    attributes: {
      [ItemAttributeType.Damage]: 10
    }
  })),

  ...Object.keys(Textures.inventory.two_handed).filter(textureKey => Textures.item.weapon[textureKey] != null).map(textureKey => new Item({
    name: `Sample Weapon ${textureKey}`,
    itemType: ItemType.TwoHandWeapon,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.two_handed[textureKey],
    equippedTexture: Textures.item.weapon[textureKey],
    attributes: {
      [ItemAttributeType.Damage]: 10
    }
  })),

  ...Object.keys(Textures.inventory.item).map(textureKey => new Item({
    name: `Sample Item ${textureKey}`,
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.item[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 1,
      [ItemAttributeType.Damage]: 1,
    }
  })),
]
