import Item from './item.js'
import ItemType from './item-type.js'
import ItemQuality from './item-quality.js'
import ItemAttributeType from './item-attribute-type.js'
import { Textures } from '../client/src/textures.js'

export const SampleItems = [
  ...Object.keys(Textures.inventory.chest).map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.Chest,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.chest[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 15
    }
  })),

  ...Object.keys(Textures.inventory.hands).map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.Hands,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.hands[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 5
    }
  })),

  ...Object.keys(Textures.inventory.feet).map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.Feet,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.feet[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 8,
      [ItemAttributeType.MovementSpeedPercent]: 20,
    }
  })),

  ...Object.keys(Textures.inventory.head).map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.Head,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.head[textureKey],
    equippedTexture: Textures.item.head[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 10
    }
  })),

  ...Object.keys(Textures.inventory.one_handed).filter(textureKey => Textures.item.weapon[textureKey] != null).map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.one_handed[textureKey],
    equippedTexture: Textures.item.weapon[textureKey],
    attributes: {
      [ItemAttributeType.Damage]: 10
    }
  })),

  new Item({
    name: 'Eebeeb Sword',
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Set,
    inventoryTexture: Textures.inventory.one_handed.eebeebsword,
    equippedTexture: Textures.item.weapon.sword,
    attributes: {
      [ItemAttributeType.Damage]: 20
    }
  }),

  new Item({
    name: 'Pellet Shooter',
    itemType: ItemType.TwoHandWeapon,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.two_handed.pelletshooter,
    equippedTexture: Textures.item.weapon.crossbow,
    attributes: {
      // make this a ranged item
      [ItemAttributeType.Damage]: 7
    }
  }),

  new Item({
    name: 'Aztec',
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.one_handed.obsidianblade,
    equippedTexture: Textures.item.weapon.club,
    attributes: {
      [ItemAttributeType.Damage]: 20
    }
  }),

  new Item({
    name: '',
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.one_handed.obsidianblade,
    equippedTexture: Textures.item.weapon.club,
    attributes: {
      [ItemAttributeType.Damage]: 20
    }
  }),
  ...Object.keys(Textures.inventory.two_handed).filter(textureKey => Textures.item.weapon[textureKey] != null).map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.TwoHandWeapon,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.two_handed[textureKey],
    equippedTexture: Textures.item.weapon[textureKey],
    attributes: {
      [ItemAttributeType.Damage]: 10
    }
  })),

  ...Object.keys(Textures.inventory.item).filter(textureKey => typeof Textures.inventory.item[textureKey] != 'object').map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.item[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 1,
      [ItemAttributeType.Damage]: 1,
    }
  })),

  ...Object.keys(Textures.inventory.item.gems).map(textureKey => new Item({
    name: textureKey,
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Normal,
    inventoryTexture: Textures.inventory.item.gems[textureKey],
    attributes: {
      [ItemAttributeType.Armor]: 1,
      [ItemAttributeType.Damage]: 1,
    }
  })),
]
