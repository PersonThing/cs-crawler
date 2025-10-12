import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'
import { Abilities } from '../abilities.js'

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

  // Fire Orb
  new Item({
    name: 'Fire Orb',
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Rare,
    inventoryTexture: Textures.inventory.item.gems.ruby,
    attributes: {
      [ItemAttributeType.FireDamage]: 25,
    },
    abilities: [Abilities.Fireball.id],
    abilityModifiers: [],
  }),

  // Frost orb
  new Item({
    name: 'Frost Orb',
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Rare,
    inventoryTexture: Textures.inventory.item.gems.sapphire,
    attributes: {
      [ItemAttributeType.ColdDamage]: 25,
    },
    abilities: [Abilities.Frostbolt.id],
    abilityModifiers: [],
  }),

  // Lightning Orb
  new Item({
    name: 'Lightning Orb',
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Rare,
    inventoryTexture: Textures.inventory.item.gems.topaz,
    attributes: {
      [ItemAttributeType.LightningDamage]: 25,
    },
    abilities: [Abilities.Lightning.id],
    abilityModifiers: [],
  }),
]
