class ItemType {
  constructor({
    name,
    validSlots: validSlotTypes,
    fillsMainAndOffHand = false,
  }) {
    if (name == null) throw new Error('ItemType name cannot be empty')
    if (validSlotTypes == null || validSlotTypes.length == 0)
      throw new Error('ItemType must fill at least 1 slot')

    this.name = name
    this.validSlotTypes = validSlotTypes
    this.fillsMainAndOffHand = fillsMainAndOffHand
  }
}

export default ItemType