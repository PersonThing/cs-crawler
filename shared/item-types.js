import ItemSlotType from './item-slot-type.js'
import ItemType from './item-type.js'

const ItemTypes = {
  TwoHandWeapon: new ItemType({
    name: 'Two-Handed Weapon',
    validSlots: [
      ItemSlotType.MainHand,
      ItemSlotType.OffHand,
      ItemSlotType.Bonus,
    ],
    fillsMainAndOffHand: true,
  }),
  OneHandWeapon: new ItemType({
    name: 'One-Handed Weapon',
    validSlots: [
      ItemSlotType.MainHand,
      ItemSlotType.OffHand,
      ItemSlotType.Bonus,
    ],
  }),
  OffHand: new ItemType({
    name: 'OffHand',
    validSlots: [
      ItemSlotType.MainHand,
      ItemSlotType.OffHand,
      ItemSlotType.Bonus,
    ],
  }),
  Chesty: new ItemType({
    name: 'Chest',
    validSlots: [ItemSlotType.Chest, ItemSlotType.Bonus],
  }),
  Head: new ItemType({
    name: 'Head',
    validSlots: [ItemSlotType.Head, ItemSlotType.Bonus],
  }),
  Hands: new ItemType({
    name: 'Hands',
    validSlots: [ItemSlotType.Hands, ItemSlotType.Bonus],
  }),
  Feet: new ItemType({
    name: 'Feet',
    validSlots: [ItemSlotType.Feet, ItemSlotType.Bonus],
  }),
  Bonus: new ItemType({
    name: 'Bonus Item',
    validSlots: [ItemSlotType.Bonus, ItemSlotType.Bonus],
  }),
}

export default ItemTypes