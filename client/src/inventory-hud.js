import {
  ART_SCALE,
  BAG_SLOTS,
  INVENTORY_HEIGHT,
  INVENTORY_WIDTH,
} from '../../shared/constants.js'
import { Graphics, Container, Sprite } from 'pixi.js'
import { Textures } from './textures.js'
import ItemSlotType from '../../shared/item-slot-type.js'
import InventorySlot from '../../shared/inventory-slot.js'

const ITEM_SIZE = 32
const PADDING = 1
const MARGIN = 6
const BAG_COLS = 10
const EQUIPPED_SLOT_COLOR = 0x00a8f3
const BONUS_SLOT_COLOR = 0x0ed145
const BAG_SLOT_COLOR = 0x555555

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
  constructor(player) {
    super()

    this.content = null
    this.renderBackground()
    
    player.inventory.store.subscribe((content) => {
      this.setContent(content)
    })
  }

  getBagSlotCoordinates(index) {
    const x = index % BAG_COLS
    const y = Math.floor(index / BAG_COLS)
    return {
      x: x * (ITEM_SIZE + PADDING + MARGIN) + MARGIN + 2,
      y: y * (ITEM_SIZE + PADDING + MARGIN) + 212,
    }
  }

  renderBackground() {
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

    const drawBg = (color, { x, y }) => {
      gfx.rect(x, y, ITEM_SIZE + PADDING, ITEM_SIZE + PADDING).stroke({
        color,
        width: 2,
      }).fill(0x000000)
    }

    const drawEquippedSlotBg = (color, inventorySlot) => {
      const coords = EquippedSlotCoordinates[inventorySlot.name]
      drawBg(color, coords)

      // background sprite for equipped slots that don't have anything in them
      if (this.content?.equipped[inventorySlot.name] != null) {
        // have something equipped, no need for bg sprite
        return
      }

      const bgSprite = Sprite.from(
        Textures.inventory.placeholders[inventorySlot.slotType.toLowerCase()]
      )
      bgSprite.x = coords.x + PADDING
      bgSprite.y = coords.y + PADDING
      bgSprite.alpha = 0.1
      this.bg.addChild(bgSprite)
    }

    const drawBagSlotBg = (index) => {
      drawBg(BAG_SLOT_COLOR, this.getBagSlotCoordinates(index))
    }

    drawEquippedSlotBg(EQUIPPED_SLOT_COLOR, InventorySlot.Head)
    drawEquippedSlotBg(EQUIPPED_SLOT_COLOR, InventorySlot.MainHand)
    drawEquippedSlotBg(EQUIPPED_SLOT_COLOR, InventorySlot.OffHand)
    drawEquippedSlotBg(EQUIPPED_SLOT_COLOR, InventorySlot.Chest)
    drawEquippedSlotBg(EQUIPPED_SLOT_COLOR, InventorySlot.Hands)
    drawEquippedSlotBg(EQUIPPED_SLOT_COLOR, InventorySlot.Feet)
    drawEquippedSlotBg(BONUS_SLOT_COLOR, InventorySlot.Bonus1)
    drawEquippedSlotBg(BONUS_SLOT_COLOR, InventorySlot.Bonus2)
    drawEquippedSlotBg(BONUS_SLOT_COLOR, InventorySlot.Bonus3)

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
    for (let i = 0; i < BAG_SLOTS; i++) {
      const item = content.bags[i]
      if (item != null) {
        const coords = this.getBagSlotCoordinates(i)
        this.drawItem(item, coords)
      }
    }

    // equipped
    Object.keys(content.equipped).forEach((slotKey) => {
      const item = content.equipped[slotKey]
      const coords = EquippedSlotCoordinates[slotKey]
      this.drawItem(item, coords)
    })
  }

  drawItem(item, { x, y }) {
    const itemSprite = Sprite.from(item.inventoryTexture)
    itemSprite.x = x
    itemSprite.y = y
    this.itemContainer.addChild(itemSprite)
  }
}

export default InventoryHud
