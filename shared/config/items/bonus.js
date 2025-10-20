import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttribute from '../item-attribute.js'
import { Textures } from '#shared/config/textures.js'
import { Abilities } from '../abilities/abilities.js'

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
            [ItemAttribute.Defense]: 1,
            [ItemAttribute.PhysicalDamage]: 1,
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
          [ItemAttribute.Defense]: 1,
          [ItemAttribute.PhysicalDamage]: 1,
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
      [ItemAttribute.FireDamage]: 25,
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
      [ItemAttribute.ColdDamage]: 25,
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
      [ItemAttribute.LightningDamage]: 25,
    },
    abilities: [Abilities.Lightning.id],
    abilityModifiers: [],
  }),

  // Healing Orb
  new Item({
    name: 'Healing Orb',
    itemType: ItemType.Bonus,
    itemQuality: ItemQuality.Rare,
    inventoryTexture: Textures.inventory.item.gems.emerald,
    attributes: {
      [ItemAttribute.Health]: 50,
    },
    abilities: [Abilities.Heal.id],
    abilityModifiers: [],
  }),
]
