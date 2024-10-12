const SlotType = {
  Head: 'Head',
  Chest: 'Chest',
  Hands: 'Hands',
  Feet: 'Feet',
  MainHand: 'MainHand',
  OffHand: 'OffHand',
  // allow them to get the effects of extra items - similar to having items cubed in d3, but just get EVERYTHING from the item, and don't destroy it
  // like.. get the armor + resists from some beefy body armor, but wear a body armor that gives you a fun ability, or vice versa
  Bonus: 'Bonus',
}

const ItemTypes = {
  TwoHandWeapon: new ItemType({
    name: 'Two-Handed Weapon',
    validSlots: [SlotType.MainHand, SlotType.OffHand, SlotType.Bonus],
    fillsMainAndOffHand: true,
  }),
  OneHandWeapon: new ItemType({
    name: 'One-Handed Weapon',
    validSlots: [SlotType.MainHand, SlotType.OffHand, SlotType.Bonus],
  }),
  OffHand: new ItemType({
    name: 'OffHand',
    validSlots: [SlotType.MainHand, SlotType.OffHand, SlotType.Bonus],
  }),
  Chesty: new ItemType({
    name: 'Chest',
    validSlots: [SlotType.Chest, SlotType.Bonus],
  }),
  Head: new ItemType({
    name: 'Head',
    validSlots: [SlotType.Head, SlotType.Bonus],
  }),
  Hands: new ItemType({
    name: 'Hands',
    validSlots: [SlotType.Hands, SlotType.Bonus],
  }),
  Feet: new ItemType({
    name: 'Feet',
    validSlots: [SlotType.Feet, SlotType.Bonus],
  }),
  Bonus: new ItemType({
    name: 'Bonus Item',
    validSlots: [SlotType.Bonus, SlotType.Bonus],
  }),
}

class ItemType {
  constructor({ name, validSlots, fillsMainAndOffHand = false }) {
    if (name == null) throw new Error('ItemType name cannot be empty')
    if (validSlots == null || validSlots.length == 0)
      throw new Error('ItemType must fill at least 1 slot')

    this.name = name
    this.slotType = validSlots
    this.fillsMainAndOffHand = fillsMainAndOffHand
  }
}

const ItemQuality = {
  Normal: 'Normal',
  Special: 'Special',
  Unique: 'Unique',
  Set: 'Set',
}

const ItemAttributeType = {
  Armor: 'Armor',
  Damage: 'Damage',
  // more later
}