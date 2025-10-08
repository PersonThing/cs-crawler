import Item from './item.js'
import ItemType from './item-type.js'
import ItemQuality from './item-quality.js'
import ItemAttributeType from './item-attribute-type.js'
import { Textures } from '#shared/config/textures.js'

export const SampleItems = [
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

  ...Object.keys(Textures.inventory.hands).map(
    textureKey =>
      new Item({
        name: textureKey,
        itemType: ItemType.Hands,
        itemQuality: ItemQuality.Normal,
        inventoryTexture: Textures.inventory.hands[textureKey],
        attributes: {
          [ItemAttributeType.Defense]: 5,
        },
      })
  ),

  ...Object.keys(Textures.inventory.feet).map(
    textureKey =>
      new Item({
        name: textureKey,
        itemType: ItemType.Feet,
        itemQuality: ItemQuality.Normal,
        inventoryTexture: Textures.inventory.feet[textureKey],
        attributes: {
          [ItemAttributeType.Defense]: 5,
          [ItemAttributeType.MovementSpeedPercent]: 20,
        },
      })
  ),

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
            [ItemAttributeType.PhysicalDamage]: 10,
            [ItemAttributeType.AttackSpeedPercent]: 20,
          },
        })
    ),

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
            [ItemAttributeType.PhysicalDamage]: 10,
            [ItemAttributeType.MovementSpeedPercent]: -5,
          },
        })
    ),

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

  //Rare Items
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

  new Item({
    name: 'Ornate Armor',
    itemType: ItemType.Chest,
    itemQuality: ItemQuality.Rare,
    inventoryTexture: Textures.inventory.chest.ornatearmor,
    attributes: {
      [ItemAttributeType.Defense]: 25,
    },
  }),

  // Unique Items
  new Item({
    name: 'Eebeeb Sword',
    itemType: ItemType.OneHandWeapon,
    itemQuality: ItemQuality.Set,
    inventoryTexture: Textures.inventory.one_handed.eebeebsword,
    equippedTexture: Textures.item.weapon.sword,
    attackingTexture: Textures.item.weapon_attacks.sword,
    attributes: {
      [ItemAttributeType.PhysicalDamage]: 20,
      [ItemAttributeType.LightningDamage]: 20,
      [ItemAttributeType.ColdDamage]: 20,
      [ItemAttributeType.PoisonDamage]: 20,
      [ItemAttributeType.AttackHitChance]: 100,
      [ItemAttributeType.FireDamage]: 20,
    },
    description: 'Lord Eebeeb finds this joke very unfunny.ඞ',
  }),

  new Item({
    name: 'Pellet Shooter',
    itemType: ItemType.TwoHandWeapon,
    itemQuality: ItemQuality.Unique,
    inventoryTexture: Textures.inventory.two_handed.pelletshooter,
    equippedTexture: Textures.item.weapon.crossbow,
    attackingTexture: Textures.item.weapon_attacks.crossbow,
    attributes: {
      // make this a ranged item
      [ItemAttributeType.PhysicalDamage]: 7,
      [ItemAttributeType.AttackHitChance]: 100,
      [ItemAttributeType.FireDamage]: 3,
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
      [ItemAttributeType.PhysicalDamage]: 20,
    },
  }),

  // Special Items
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

  // Set Items
]

export const generateItemId = () => {
  // avoid crypto.randomUUID(), it's not available everywhere
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

export const stampItemId = item => {
  return {
    id: generateItemId(),
    ...item,
  }
}

export const generateRandomItem = () => {
  return stampItemId(SampleItems[Math.floor(Math.random() * SampleItems.length)])
}

export const generateRandomItemOfType = itemTypes => {
  const possibleItemsOfType = SampleItems.filter(item => itemTypes.includes(item.itemType))
  if (possibleItemsOfType.length === 0) {
    throw new Error(
      `cannot generate random item, no items of types: ${itemTypes.map(it => it.name).join(', ')}`
    )
  }
  return stampItemId(
    structuredClone(possibleItemsOfType[Math.floor(Math.random() * possibleItemsOfType.length)])
  )
}