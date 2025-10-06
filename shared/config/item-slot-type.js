const ItemSlotType = {
  Head: 'Head',
  Chest: 'Chest',
  Hands: 'Hands',
  Feet: 'Feet',
  MainHand: 'MainHand',
  OffHand: 'OffHand',
  Bonus: 'Bonus',

  // allow them to get the effects of extra items - similar to having items cubed in d3, but just get EVERYTHING from the item, and don't destroy it
  // like.. get the armor + resists from some beefy body armor, but wear a body armor that gives you a fun ability, or vice versa
}

export default ItemSlotType