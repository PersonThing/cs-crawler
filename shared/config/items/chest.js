import Item from '../item.js'
import ItemType from '../item-type.js'
import ItemQuality from '../item-quality.js'
import ItemAttributeType from '../item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'
import { Abilities, AbilityModifiers } from '../abilities/abilities.js'

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
      [ItemAttributeType.PhysicalResistPercent]: 50,
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
      [ItemAttributeType.MaxTurrets]: 5,
    },
    abilities: [Abilities.Fireball.id],
    abilityModifiers: [AbilityModifiers.Turret.id],
  }),

  new Item({
    // Multi-ability caster chest for testing
    name: 'Arcane Robes',
    itemType: ItemType.Chest,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.chest.ornatearmor, // reusing texture for now
    attributes: {
      [ItemAttributeType.Defense]: 15,
      [ItemAttributeType.MaxPets]: 3,
    },
    abilities: [Abilities.Fireball.id],
    abilityModifiers: [AbilityModifiers.Pet.id, AbilityModifiers.CastOnCooldown.id],
  }),
]