import ItemSlotType from './item-slot-type.js'

const CreateItemType = ({ name, validSlotTypes, ranged, bothHands = false }) => {
  if (name == null) {
    throw new Error('ItemType name cannot be empty')
  }
  if (validSlotTypes == null || validSlotTypes.length == 0) {
    throw new Error('ItemType must fill at least 1 slot')
  }

  return {
    name,
    validSlotTypes,
    ranged,
    bothHands,
  }
}

const ItemType = {
  TwoHandWeapon: CreateItemType({
    name: 'Two-Handed Weapon',
    validSlotTypes: [
      ItemSlotType.MainHand,
      ItemSlotType.Bonus,
    ],
    bothHands: true,
  }),
  OneHandWeapon: CreateItemType({
    name: 'One-Handed Weapon',
    validSlotTypes: [
      ItemSlotType.MainHand,
      ItemSlotType.OffHand,
      ItemSlotType.Bonus,
    ],
  }),
  OffHand: CreateItemType({
    name: 'OffHand',
    validSlotTypes: [
      ItemSlotType.MainHand,
      ItemSlotType.OffHand,
      ItemSlotType.Bonus,
    ],
  }),
  Chest: CreateItemType({
    name: 'Chest',
    validSlotTypes: [ItemSlotType.Chest, ItemSlotType.Bonus],
  }),
  Head: CreateItemType({
    name: 'Head',
    validSlotTypes: [ItemSlotType.Head, ItemSlotType.Bonus],
  }),
  Hands: CreateItemType({
    name: 'Hands',
    validSlotTypes: [ItemSlotType.Hands, ItemSlotType.Bonus],
  }),
  Feet: CreateItemType({
    name: 'Feet',
    validSlotTypes: [ItemSlotType.Feet, ItemSlotType.Bonus],
  }),
  Bonus: CreateItemType({
    name: 'Bonus Item',
    validSlotTypes: [ItemSlotType.Bonus, ItemSlotType.Bonus],
  }),
}

export default ItemType
