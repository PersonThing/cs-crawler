import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttribute from '../item-attribute.js'
import { Textures } from '#shared/config/textures.js'
import ItemSet from './sets.js'

export const weaponItems = [
  // One-handed weapons
  ...Object.keys(Textures.inventory.one_handed)
    .filter(textureKey => Textures.item.weapon[textureKey] != null)
    .map(
      textureKey =>
        new Item({
          name: textureKey,
          itemType: ItemType.OneHandWeapon,
          itemQuality: ItemQuality.Normal,
          inventoryTexture: Textures.inventory.one_handed[textureKey],
          equippedTexture: Textures.item.weapon[textureKey],
          attackingTexture: Textures.item.weapon_attacks[textureKey],
          attributes: {
            [ItemAttribute.PhysicalDamage]: 10,
            [ItemAttribute.AttackSpeedPercent]: 20,
          },
        })
    ),

  // Two-handed weapons
  ...Object.keys(Textures.inventory.two_handed)
    .filter(textureKey => Textures.item.weapon[textureKey] != null)
    .map(
      textureKey =>
        new Item({
          name: textureKey,
          itemType: ItemType.TwoHandWeapon,
          itemQuality: ItemQuality.Normal,
          inventoryTexture: Textures.inventory.two_handed[textureKey],
          equippedTexture: Textures.item.weapon[textureKey],
          attackingTexture: Textures.item.weapon_attacks[textureKey],
          attributes: {
            [ItemAttribute.PhysicalDamage]: 10,
            [ItemAttribute.MovementSpeedPercent]: -5,
          },
        })
    ),

  // Unique weapons
  new Item({
    name: 'Pellet Shooter',
    itemType: ItemType.TwoHandWeapon,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.two_handed.pelletshooter,
    equippedTexture: Textures.item.weapon.crossbow,
    attackingTexture: Textures.item.weapon_attacks.crossbow,
    attributes: {
      // make this a ranged item
      [ItemAttribute.PhysicalDamage]: 7,
      [ItemAttribute.AttackHitChance]: 100,
      [ItemAttribute.FireDamage]: 3,
    },
  }),

  new Item({
    name: 'Aztec',
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.one_handed.obsidianblade,
    equippedTexture: Textures.item.weapon.club,
    attackingTexture: Textures.item.weapon_attacks.club,
    attributes: {
      [ItemAttribute.PhysicalDamage]: 20,
    },
  }),

  // Set weapons
  new Item({
    name: "Eebeeb's Sword",
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Set,
    setId: ItemSet.Eebeeb.id,
    inventoryTexture: Textures.inventory.one_handed.eebeebsword,
    equippedTexture: Textures.item.weapon.sword,
    attackingTexture: Textures.item.weapon_attacks.sword,
    attributes: {
      [ItemAttribute.PhysicalDamage]: 20,
      [ItemAttribute.LightningDamage]: 20,
      [ItemAttribute.ColdDamage]: 20,
      [ItemAttribute.PoisonDamage]: 20,
      [ItemAttribute.AttackHitChance]: 100,
      [ItemAttribute.FireDamage]: 20,
    },
    description: 'Lord Eebeeb finds this joke very unfunny.ඞ',
  }),
]
