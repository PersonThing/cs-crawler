import { BAG_SLOTS } from '../../shared/constants.js'
import { Graphics, Container, Sprite, Text } from 'pixi.js'
import { ItemQualityColors } from '../../shared/item-quality.js'
import { Textures } from './textures.js'
import InventorySlot from '../../shared/inventory-slot.js'
import InventoryItem from './inventory-item.js'

const ITEM_SIZE = 32
const PADDING = 4
const MARGIN = 5
const BAG_COLS = 10
const INVENTORY_HEIGHT = (ITEM_SIZE + PADDING + MARGIN) * 11.5
const INVENTORY_WIDTH = (ITEM_SIZE + PADDING + MARGIN) * BAG_COLS + MARGIN * 2
const DEFAULT_SLOT_COLOR = 0x777777

const getItemSlotCoordinates = (x, y) => {
  return {
    x: x * (ITEM_SIZE + PADDING + MARGIN) + INVENTORY_WIDTH / 2 - ITEM_SIZE / 2,
    y: y * (ITEM_SIZE + PADDING + MARGIN) + 20,
  }
}

const EquippedSlotCoordinates = {
  [InventorySlot.Head.name]: getItemSlotCoordinates(0, 0),
  [InventorySlot.MainHand.name]: getItemSlotCoordinates(-1, 0.5),
  [InventorySlot.OffHand.name]: getItemSlotCoordinates(1, 0.5),
  [InventorySlot.Chest.name]: getItemSlotCoordinates(0, 1),
  [InventorySlot.Hands.name]: getItemSlotCoordinates(-1, 1.5),
  [InventorySlot.Feet.name]: getItemSlotCoordinates(1, 1.5),
  [InventorySlot.Bonus1.name]: getItemSlotCoordinates(-1, 3),
  [InventorySlot.Bonus2.name]: getItemSlotCoordinates(0, 3),
  [InventorySlot.Bonus3.name]: getItemSlotCoordinates(1, 3),
}

class InventoryHud extends Container {
  constructor(app, player) {
    super()

    this.app = app
    
    this.content = null
    this.renderBackground()
    
    this.playerInventory = player.inventory
    this.playerInventory.store.subscribe(content => {
      this.setContent(content)
    })

    // track cursor position and move cursor item with mouse
    this.cursorPosition = { x: 0, y: 0 }

    this.app.canvas.addEventListener('mousemove', event => {
      this.cursorPosition = {
        x: event.clientX - this.x - ITEM_SIZE / 2,
        y: event.clientY - this.y - ITEM_SIZE / 2,
      }
      if (this.cursorItem != null) {
        this.setCursorItemPosition()
      }
    })

    // kill any click events that bubble through, so player doesn't move when clicking inside inventory
    this.eventMode = 'static'
    this.on('mousedown', event => {
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }

  setCursorItemPosition() {
    this.cursorItem.x = this.cursorBg.x = this.cursorPosition.x
    this.cursorItem.y = this.cursorBg.y = this.cursorPosition.y
  }

  getBagSlotCoordinates(index) {
    const x = index % BAG_COLS
    const y = Math.floor(index / BAG_COLS)
    return {
      x: x * (ITEM_SIZE + PADDING + MARGIN) + MARGIN + 2,
      y: y * (ITEM_SIZE + PADDING + MARGIN) + 212,
    }
  }

  drawItemBg(color, { x, y }) {
    const g = new Graphics()
      .rect(0, 0, ITEM_SIZE + PADDING, ITEM_SIZE + PADDING)
      .stroke({
        color,
        width: 2,
      })
      .fill(0x000000)
    g.x = x
    g.y = y
    this.bg.addChild(g)
    return g
  }

  renderBackground() {
    if (this.cursorItem != null) {
      this.cursorItem.destroy()
      this.cursorItem = null
      this.cursorBg.destroy()
      this.cursorBg = null
    }
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }
    this.bg = new Container()
    this.addChild(this.bg)

    const gfx = new Graphics()
      .roundRect(0, 0, INVENTORY_WIDTH, INVENTORY_HEIGHT, 6)
      .fill(0x333333)
      .stroke({
        color: 0x555555,
        width: 4,
      })
    gfx.alpha = 0.5
    gfx.x = 0
    gfx.y = 0
    this.bg.addChild(gfx)

    const drawEquippedSlotBg = inventorySlot => {
      const coords = EquippedSlotCoordinates[inventorySlot.name]
      const item = this.content?.equipped[inventorySlot.name]
      const color = item != null ? ItemQualityColors[item.itemQuality] : DEFAULT_SLOT_COLOR
      this.drawItemBg(color, coords)

      if (
        // background sprite for equipped slots that don't have anything in them
        this.content?.equipped[inventorySlot.name] != null ||
        // or if it's offhand slot and 2h is equipped in main hand
        (inventorySlot.name == InventorySlot.OffHand.name &&
          this.content?.equipped[InventorySlot.MainHand.name] != null &&
          this.content.equipped[InventorySlot.MainHand.name].itemType.bothHands)
      ) {
        // have something equipped, no need for bg sprite
        return
      }

      const bgSprite = Sprite.from(
        Textures.inventory.placeholders[inventorySlot.slotType.toLowerCase()]
      )
      bgSprite.x = coords.x + PADDING
      bgSprite.y = coords.y + PADDING
      bgSprite.alpha = 0.25
      bgSprite.eventMode = 'static'
      bgSprite.on('mousedown', () => {
        console.log('empty equipped slot click', inventorySlot.name)
        this.playerInventory.clickEquippedSlot(inventorySlot.name)
      })
      this.bg.addChild(bgSprite)
    }

    const drawBagSlotBg = index => {
      const item = this.content?.bags[index]
      const color = item != null ? ItemQualityColors[item.itemQuality] : DEFAULT_SLOT_COLOR
      const slotBg = this.drawItemBg(color, this.getBagSlotCoordinates(index))
      slotBg.eventMode = 'static'
      slotBg.on('mousedown', () => {
        console.log('empty bag slot click', index)
        this.playerInventory.clickBagSlot(index)
      })
    }

    drawEquippedSlotBg(InventorySlot.Head)
    drawEquippedSlotBg(InventorySlot.MainHand)
    drawEquippedSlotBg(InventorySlot.OffHand)
    drawEquippedSlotBg(InventorySlot.Chest)
    drawEquippedSlotBg(InventorySlot.Hands)
    drawEquippedSlotBg(InventorySlot.Feet)
    drawEquippedSlotBg(InventorySlot.Bonus1)
    drawEquippedSlotBg(InventorySlot.Bonus2)
    drawEquippedSlotBg(InventorySlot.Bonus3)

    // draw bg for bag slots
    for (let i = 0; i < BAG_SLOTS; i++) {
      drawBagSlotBg(i)
    }
  }

  setContent(content) {
    this.content = content

    // re-render background so equipped slot sprites go away
    this.renderBackground()

    if (this.itemContainer != null) {
      this.removeChild(this.itemContainer)
      this.itemContainer.destroy()
    }

    this.itemContainer = new Container()
    this.addChild(this.itemContainer)

    // bags
    for (let index = 0; index < BAG_SLOTS; index++) {
      const item = content.bags[index]
      if (item != null) {
        const coords = this.getBagSlotCoordinates(index)
        const itemSprite = this.drawItem(item, coords)
        itemSprite.on('mousedown', () => {
          console.log('filled bag slot click', index)
          this.playerInventory.clickBagSlot(index)
        })
      }
    }

    // equipped
    Object.keys(content.equipped).forEach(slotName => {
      const item = content.equipped[slotName]
      if (item == null) {
        return
      }

      const coords = EquippedSlotCoordinates[slotName]
      const itemSprite = this.drawItem(item, coords)
      itemSprite.on('mousedown', () => {
        console.log('filled equipped slot click', slotName)
        this.playerInventory.clickEquippedSlot(slotName)
      })

      // if 2h weapon, render a greyed out version of sprite
      if (slotName === InventorySlot.MainHand.name && item.itemType.bothHands) {
        const coords = EquippedSlotCoordinates[InventorySlot.OffHand.name]
        this.drawItem(item, coords, true)
        // itemSprite.on('mousedown', (e) => {
        //   console.log('filled 2h slot offhand click', slotName)
        //   this.playerInventory.clickEquippedSlot(slotName)
        // })
      }
    })

    // cursor
    if (content.cursor != null) {
      const color = ItemQualityColors[content.cursor.itemQuality]
      this.cursorBg = this.drawItemBg(color, { x: 0, y: 0 })
      this.cursorBg.eventMode = 'none'
      this.cursorItem = this.drawItem(content.cursor, { x: 0, y: 0 })
      this.cursorItem.eventMode = 'none'
      this.setCursorItemPosition()
      // TODO move these with mouse
    }
  }

  drawItem(item, { x, y }, isDisabledOffHand) {
    const inventoryItem = new InventoryItem(item, { x, y }, isDisabledOffHand)
    this.itemContainer.addChild(inventoryItem)
    return inventoryItem
  }
}

export default InventoryHud
