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
  // Inventory instance
  let inv
  const fillBags = () => {
    for (let i = 0; i < BAG_SLOTS; i++) {
      if (inv.bags[i] != null) continue
      inv.setBagSlot(i, makeItem())
    }
    // todo: figure out why pickup() was looping forever
    // while (inv.pickup(makeItem())) {}
  }
  const fillBonusSlots = () => {
    inv.equip(makeItem(ItemType.Feet), InventorySlot.Bonus1.name)
    inv.equip(makeItem(ItemType.Feet), InventorySlot.Bonus2.name)
    inv.equip(makeItem(ItemType.Feet), InventorySlot.Bonus3.name)
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
    const ok = inv.equip(item, slot)
    expect(ok).toBe(true)
    expect(inv.getEquippedSlot(slot)).toBe(item)
  })

  it('equip swaps previously equipped to same bag slot if item came from bag', () => {
    const chest1 = makeItem(ItemType.Chest)
    const chest2 = makeItem(ItemType.Chest)
    inv.setEquippedSlot(InventorySlot.Chest.name, chest1)
    inv.setBagSlot(0, chest2)
    const did = inv.equip(chest2, InventorySlot.Chest.name)
    expect(did).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.Chest.name)).toBe(chest2)
    expect(inv.bags[0]).toBe(chest1)
  })

  it('equip swaps previously equipped to cursor if item came from cursor', () => {
    const chest1 = makeItem(ItemType.Chest)
    const chest2 = makeItem(ItemType.Chest)
    inv.setEquippedSlot(InventorySlot.Chest.name, chest1)
    inv.setCursor(chest2)
    const did = inv.equip(chest2, InventorySlot.Chest.name)
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
    Object.values(InventorySlot).forEach(slot => {
      const validItemType = Object.values(ItemType).find(type => type.validSlotTypes.includes(slot.slotType) && !type.bothHands)
      const item = makeItem(validItemType)
      inv.equip(item, slot.name)
    })
    const item = makeItem()
    const did = inv.pickup(item)
    expect(did).toBe(true)
    const inBags = inv.bags.includes(item)
    expect(inBags).toBe(true)
  })

  it('serialize / deserialize round trip', () => {
    const item = makeItem()
    const slot = inv.getValidSlotNamesForItem(item)[0]
    inv.equip(item, slot)
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

  it('can equip 2h with mainhand equipped and offhand empty from cursor', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can equip 2h with mainhand equipped and offhand empty from bag slot', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.setBagSlot(0, two)
    expect(inv.equipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can equip 2h with mainhand empty and offhand equipped from cursor', () => {
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can equip 2h with mainhand empty and offhand equipped from bag slot', () => {
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, two)
    expect(inv.equipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('can equip 2h with mainhand and offhand equipped and bag space available from cursor', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
    expect(inv.bags.includes(oneB)).toBe(true)
  })

  it('can equip 2h with mainhand and offhand equipped and bag space available from bag slot', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, two)
    expect(inv.equipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
    expect(inv.bags.includes(oneB)).toBe(true)
  })

  it('cannot equip 2h with mainhand and offhand equipped and no bag space available from cursor', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    fillBags()
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(false)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
  })

  // TODO: instead of bonus slot, this should go in weapon slot, and put the extra item on cursor.. putInBags() isn't factoring that the original item will be removed from the bag to make room
  it('can equip 2h from bag slot even with all equipped slots full and no bag space - goes in first bonus slot', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, two)
    fillBags()
    fillBonusSlots() // if bonus slots are available, it'd go there
    const originalBonusItem = inv.equipped[InventorySlot.Bonus1.name]
    expect(inv.equipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(originalBonusItem)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.Bonus1.name)).toBe(two)
  })


  it('can equip 2h with mainhand and offhand equipped and bag space available from bag slot', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setBagSlot(0, two)
    expect(inv.equipFromBagSlot(0)).toBe(true)
    expect(inv.bags[0]).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
    expect(inv.bags.includes(oneB)).toBe(true)
  })

  it('can swap 1h for equipped 2h', () => {
    inv.equip(two, InventorySlot.MainHand.name)
    inv.setCursor(oneA)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('cannot equip 2h in offhand', () => {
    expect(inv.equip(two, InventorySlot.OffHand.name)).toBe(false)
  })

  it('cannot equip 2h to offhand from cursor', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.setCursor(two)
    expect(inv.clickEquippedSlot(InventorySlot.OffHand.name)).toBe(false)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
  })

  it('equip handles 2h -> 2h swapping correctly', () => {
    inv.equip(two, InventorySlot.MainHand.name)
    const twoB = makeItem(ItemType.TwoHandWeapon)
    inv.setCursor(twoB)
    expect(inv.clickEquippedSlot(InventorySlot.MainHand.name)).toBe(true)
    expect(inv.cursor).toBe(two)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(twoB)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('putting a 2h in bonus leaves mainhand and offhand alone', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    inv.equip(oneB, InventorySlot.OffHand.name)
    inv.equip(two, InventorySlot.Bonus1.name)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBe(oneB)
    expect(inv.getEquippedSlot(InventorySlot.Bonus1.name)).toBe(two)
  })

  it('picking up 2h with 1h equipped puts in bag, not offhand', () => {
    inv.equip(oneA, InventorySlot.MainHand.name)
    fillBonusSlots()
    const did = inv.pickup(two)
    expect(did).toBe(true)
    expect(inv.bags.includes(two)).toBe(true)
    expect(inv.getEquippedSlot(InventorySlot.MainHand.name)).toBe(oneA)
    expect(inv.getEquippedSlot(InventorySlot.OffHand.name)).toBeNull()
  })

  it('hash changes when inventory changes', () => {
    const initialHash = inv.hash
    const item = makeItem()
    const slot = inv.getValidSlotNamesForItem(item)[0]
    inv.equip(item, slot)
    expect(inv.hash).not.toBe(initialHash)
  })

  it('2 inv with same content yield same hash', () => {
    const item = makeItem()
    const slot = inv.getValidSlotNamesForItem(item)[0]
    inv.equip(item, slot)
    const hash1 = inv.hash
    const snap = inv.serialize()

    const inv2 = new ItemInventory()
    inv2.deserialize(snap)
    const hash2 = inv2.hash
    expect(hash2).toBe(hash1)
  })
})
