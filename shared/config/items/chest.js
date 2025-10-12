import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'
import { Abilities, AbilityModifiers } from '../abilities.js'

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

  // Unique chest items
  new Item({
    // Tanky chest for melee users
    name: 'Ornate Armor',
    itemType: ItemType.Chest,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.chest.ornatearmor,
    attributes: {
      [ItemAttributeType.Defense]: 100,
      [ItemAttributeType.PhysicalResist]: 50,
    },
  }),

  new Item({
    // Caster chest that grants some turret abilities
    name: 'Arctic Pelt',
    itemType: ItemType.Chest,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.chest.arcticpelts,
    attributes: {
      [ItemAttributeType.Defense]: 25,
      [ItemAttributeType.ExtraProjectiles]: 5,

      // abilities
      [ItemAttributeType.GrantAbility]: Abilities.Fireball.id,
      [ItemAttributeType.GrantAbilityModifier]: AbilityModifiers.Turret.id,
      [ItemAttributeType.MaxTurrets]: 5,
    },
  }),
]