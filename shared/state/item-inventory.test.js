import { describe, it, expect, beforeEach } from 'vitest'
import { generateItemId } from '#shared/config/items'
import InventorySlot from '#shared/config/inventory-slot.js'
import ItemInventory from '#shared/state/item-inventory.js'
import ItemType from '#shared/config/item-type.js'
import { BAG_SLOTS } from '#shared/config/constants'

const makeItem = (type = Object.values(ItemType)[0]) => ({
  id: generateItemId(),
  itemType: type,
})
const oneA = makeItem(ItemType.OneHandWeapon)
const oneB = makeItem(ItemType.OneHandWeapon)
const two = makeItem(ItemType.TwoHandWeapon)

describe('ItemInventory', () => {
  // inventory used by all tests - only instantiating for intellisense, gets reset in beforeEach()
  let inv = new ItemInventory()

  const fillBags = () => {
    for (let i = 0; i < BAG_SLOTS; i++) {
      if (inv.bags[i] != null) continue
      inv.setBagSlot(i, makeItem())
    }
    // todo: figure out why pickup() was looping forever
    // while (inv.pickup(makeItem())) {}
  }
  const fillBonusSlots = () => {
    inv.tryEquip(makeItem(ItemType.Bonus), InventorySlot.Bonus1.name)
    inv.tryEquip(makeItem(ItemType.Bonus), InventorySlot.Bonus2.name)
    inv.tryEquip(makeItem(ItemType.Bonus), InventorySlot.Bonus3.name)
  }
  const fillEquip = () => {
    Object.values(InventorySlot).forEach(slot => {
      const validItemType = Object.values(ItemType).find(type => type.validSlotTypes.includes(slot.slotType) && !type.bothHands)
      const item = makeItem(validItemType)
      inv.tryEquip(item, slot.name)
    })
  }

  beforeEach(() => {
    inv = new ItemInventory()
  })

  it('starts empty', () => {
    expect(inv.bags.length === 0 || inv.bags.every(i => i == null)).toBe(true)
    expect(Object.values(inv.equipped).every(i => i == null)).toBe(true)
  })

  it('can set and clear bag slot', () => {
    const item = makeItem()
    inv.setBagSlot(0, item)
    expect(inv.bags[0]).toBe(item)
    inv.clearBagSlot(0)
    expect(inv.bags[0]).toBeNull()
  })

  it('equip works', () => {
    const item = makeItem()
    const possibleSlots = inv.getValidSlotNamesForItem(item)
    const slot = possibleSlots[0]
    const ok = inv.tryEquip(item, slot)
    expect(ok).toBe(true)
    expect(inv.getEquippedSlot(slot)).toBe(item)
  })

  it('equip swaps previously equipped to same bag slot if item came from bag', () => {
    const chest1 = makeItem(ItemType.Chest)
    const chest2 = makeItem(ItemType.Chest)
    inv.setEquippedSlot(InventorySlot.Chest.name, chest1)
    inv.setBagSlot(0, chest2)
    const did = inv.tryEquip(chest2, InventorySlot.Chest.name)
    expect(did).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.Chest.name)).toBe(chest2)
    expect(inv.bags[0]).toBe(chest1)
  })

  it('equip swaps previously equipped to cursor if item came from cursor', () => {
    const chest1 = makeItem(ItemType.Chest)
    const chest2 = makeItem(ItemType.Chest)
    inv.setEquippedSlot(InventorySlot.Chest.name, chest1)
    inv.setCursor(chest2)
    const did = inv.tryEquip(chest2, InventorySlot.Chest.name)
    expect(did).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.Chest.name)).toBe(chest2)
    expect(inv.cursor).toBe(chest1)
  })

  it('pickup auto-equips if possible', () => {
    const item = makeItem()
    const did = inv.pickup(item)
    expect(did).toBe(true)
    const equippedSomewhere = Object.values(inv.equipped).includes(item)
    expect(equippedSomewhere).toBe(true)
  })

  it('pickup puts in bag if cannot equip', () => {
    fillEquip()
    const item = makeItem()
    const did = inv.pickup(item)
    expect(did).toBe(true)
    const inBags = inv.bags.includes(item)
    expect(inBags).toBe(true)
  })

  it('pickup fails if cannot equip and no bag space', () => {
    fillEquip()
    fillBags()
    const item = makeItem()
    const did = inv.pickup(item)
    expect(did).toBe(false)
    const inBags = inv.bags.includes(item)
    expect(inBags).toBe(false)
  })

  it('serialize / deserialize round trip', () => {
    const item = makeItem()
    const slot = inv.getValidSlotNamesForItem(item)[0]
    inv.tryEquip(item, slot)
    const snap = inv.serialize()
    const inv2 = new ItemInventory()
    inv2.deserialize(snap)
    expect(inv2.equipped[slot].itemType.name).toBe(item.itemType.name)
  })

  it('cursor set/clear works', () => {
    const item = makeItem()
    inv.setCursor(item)
    expect(inv.cursor).toBe(item)
    inv.clearCursor()
    expect(inv.cursor).toBeNull()
  })

  // TODO: see comment in item.pickup()
  // it('can pick up item to cursor if no room', () => {
  //   fillBags()
  //   fillEquip()
  //   const item1 = makeItem()
  //   const did = inv.pickup(item1)
  //   expect(did).toBe(true)
  //   expect(inv.cursor).toBe(item1)

  //   // but can't pick up another, other item is already on cursor
  //   const item2 = makeItem()
  //   const did2 = inv.pickup(item2)
  //   expect(did2).toBe(false)
  //   expect(inv.cursor).toBe(item1)
  // })

  it('can swap 2h for 1h+empty from cursor', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can swap 2h for 1h+empty from bag slot', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.setBagSlot(0, two)
    expect(inv.tryEquipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can swap 2h for empty+1h from cursor', () => {
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can swap 2h for empty+1h from bag slot', () => {
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, two)
    expect(inv.tryEquipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can swap 2h for 1h+1h with bag space available from cursor', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
    expect(inv.bags.includes(oneB)).toBe(true)
  })

  it('can swap 2h for 1h+1h with bag space available from bag slot', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, two)
    expect(inv.tryEquipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
    expect(inv.bags.includes(oneB)).toBe(true)
  })

  it('cannot swap 2h for 1h+1h with no bag space available from cursor', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    fillBags()
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(false)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
  })

  it('cannot swap 2h for 1h+1h with no bag space available from bag slot', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, two)
    fillBags()
    fillBonusSlots() // if bonus slots are available, it'd go there
    expect(inv.tryEquipFromBagSlot(0)).toBe(false)
    expect(inv.bags[0]).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
  })

  it('can swap 1h for equipped 2h', () => {
    inv.tryEquip(two, InventorySlot.MainHand.name)
    inv.setCursor(oneA)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('cannot equip 2h in offhand', () => {
    expect(inv.tryEquip(two, InventorySlot.OffHand.name)).toBe(false)
  })

  it('cannot equip 2h to offhand from cursor', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.OffHand.name)).toBe(false)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
  })

  it('can swap 2h for 2h from cursor', () => {
    inv.tryEquip(two, InventorySlot.MainHand.name)
    const twoB = makeItem(ItemType.TwoHandWeapon)
    inv.setCursor(twoB)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(twoB)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can swap 2h for 2h from bag slot', () => {
    inv.tryEquip(two, InventorySlot.MainHand.name)
    const twoB = makeItem(ItemType.TwoHandWeapon)
    inv.setBagSlot(0, twoB)
    expect(inv.tryEquipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(twoB)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('putting a 2h in bonus leaves mainhand and offhand alone', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.tryEquip(two, InventorySlot.Bonus1.name)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.Bonus1.name)).toBe(two)
  })

  it('picking up 2h with 1h equipped puts in bag, not offhand', () => {
    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    fillBonusSlots()
    const did = inv.pickup(two)
    expect(did).toBe(true)
    expect(inv.bags.includes(two)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('equipping bonus items from bag slot fills empty slots first, then swaps with first occupied slot', () => {
    const bonusA = makeItem(ItemType.Bonus)
    const bonusB = makeItem(ItemType.Bonus)
    const bonusC = makeItem(ItemType.Bonus)
    const bonusD = makeItem(ItemType.Bonus)
    inv.setBagSlot(0, bonusA)
    inv.setBagSlot(1, bonusB)
    inv.setBagSlot(2, bonusC)
    expect(inv.tryEquipFromBagSlot(0)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.Bonus1.name)).toBe(bonusA)
    expect(inv.tryEquipFromBagSlot(1)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.Bonus2.name)).toBe(bonusB)
    expect(inv.tryEquipFromBagSlot(2)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.Bonus3.name)).toBe(bonusC)
    inv.setBagSlot(3, bonusD)
    expect(inv.tryEquipFromBagSlot(3)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.Bonus1.name)).toBe(bonusD)
    expect(inv.bags.includes(bonusA)).toBe(true)
  })

  it('equipping 1h weapons from bag slot fills empty slots first, then swaps with mainhand', () => {
    const oneC = makeItem(ItemType.OneHandWeapon)
    inv.setBagSlot(0, oneA)
    inv.setBagSlot(1, oneB)
    inv.setBagSlot(2, oneC)

    expect(inv.tryEquipFromBagSlot(0)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)

    expect(inv.tryEquipFromBagSlot(1)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)

    expect(inv.tryEquipFromBagSlot(2)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneC)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
    expect(inv.bags.includes(oneA)).toBe(true)

    expect(inv.tryEquipFromBagSlot(2)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
    expect(inv.bags.includes(oneC)).toBe(true)
  })

  it('equip from bag slot will try offhand first if reverse param is true', () => {
    const oneC = makeItem(ItemType.OneHandWeapon)

    inv.tryEquip(oneA, InventorySlot.MainHand.name)
    inv.tryEquip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, oneC)
    
    expect(inv.tryEquipFromBagSlot(0, true)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneC)
    expect(inv.bags.includes(oneB)).toBe(true)
    
    expect(inv.tryEquipFromBagSlot(0, false)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneC)
    expect(inv.bags.includes(oneA)).toBe(true)
  })

  it('hash changes when inventory changes', () => {
    const initialHash = inv.hash
    const item = makeItem()
    const slot = inv.getValidSlotNamesForItem(item)[0]
    inv.tryEquip(item, slot)
    expect(inv.hash).not.toBe(initialHash)
  })

  it('2 inv with same content yield same hash', () => {
    const item = makeItem()
    const slot = inv.getValidSlotNamesForItem(item)[0]
    inv.tryEquip(item, slot)
    const hash1 = inv.hash
    const snap = inv.serialize()

    const inv2 = new ItemInventory()
    inv2.deserialize(snap)
    const hash2 = inv2.hash
    expect(hash2).toBe(hash1)
  })
})
