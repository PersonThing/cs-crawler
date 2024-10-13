import Item from './item.js'
import ItemType from './item-type.js'
import ItemQuality from './item-quality.js'
import ItemAttributeType from './item-attribute-type.js'
import { Textures } from '../client/src/textures.js'

export const SampleItems = [
  ...Object.keys(Textures.inventory.armor).map(textureKey => new Item({
    name: `Sample Armor ${textureKey}`,
    itemType: textureKey.indexOf('armor') > -1 ? ItemType.Chest : ItemType.Head,
    itemQuality: ItemQuality.Normal,
    texture: Textures.inventory.armor[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 10
    }
  })),

  ...Object.keys(Textures.inventory.weapon).map(textureKey => new Item({
    name: `Sample Weapon ${textureKey}`,
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Normal,
    texture: Textures.inventory.weapon[textureKey],
    attributes: {
      [ItemAttributeType.Damage]: 10
    }
  })),

  ...Object.keys(Textures.inventory.charm).map(textureKey => new Item({
    name: `Sample Charm ${textureKey}`,
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Normal,
    texture: Textures.inventory.charm[textureKey],
    attributes: {
      [ItemAttributeType.Damage]: 10
    }
  })),
]
