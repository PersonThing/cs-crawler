import {
  ART_SCALE,
  INVENTORY_WIDTH,
  INVENTORY_HEIGHT,
} from '../../shared/constants.js'
import { Graphics, Container, Sprite } from 'pixi.js'
import { Textures } from './textures.js'
import ItemSlotType from '../../shared/item-slot-type.js'

class InventoryHud extends Container {
  constructor() {
    super()

    // for each item slot type, draw a square and put a label above it
    // Object.keys(ItemSlotType).forEach((key) => {})

    const bg = new Graphics()
      .roundRect(0, 0, INVENTORY_WIDTH, INVENTORY_HEIGHT, 6)
      .fill(0x585858)
      .stroke({
        color: 0x555555,
        width: 4,
      })
    bg.alpha = 0.5
    bg.x = 0
    bg.y = 0
    this.addChild(bg)

    const itemSize = 32
    const padding = 1
    const margin = 6

    const drawItemBg = (color, x, y, itemSlotType) => {
      let drawX = x * (itemSize + padding + margin)
      let drawY = y * (itemSize + padding + margin)

      if (itemSlotType) {
        // equipped slots
        drawX += this.width / 2 - itemSize / 2
        drawY += 20
      } else {
        // bags
        drawX += margin + 2
        drawY += 212
      }

      bg.rect(drawX, drawY, itemSize + padding, itemSize + padding).stroke({
        color,
        width: 2,
      })

      if (itemSlotType) {
        // draw the background sprite (later: change so this only happens when nothing is equipped?)
        if (itemSlotType == ItemSlotType.Bonus) return

        const bgSprite = Sprite.from(
          Textures.inventory.placeholders[itemSlotType.toLowerCase()]
        )
        bgSprite.x = drawX + padding
        bgSprite.y = drawY + padding
        bgSprite.alpha = 0.25
        this.addChild(bgSprite)
      }
    }

    // draw bg for each item slot
    const EQUIPPED_SLOT_COLOR = 0x00a8f3
    const BONUS_SLOT_COLOR = 0x0ed145
    const BAG_SLOT_COLOR = 0x555555

    drawItemBg(EQUIPPED_SLOT_COLOR, 0, 0, ItemSlotType.Head)
    drawItemBg(EQUIPPED_SLOT_COLOR, -1, 0.5, ItemSlotType.MainHand)
    drawItemBg(EQUIPPED_SLOT_COLOR, 1, 0.5, ItemSlotType.OffHand)
    drawItemBg(EQUIPPED_SLOT_COLOR, 0, 1, ItemSlotType.Chest)
    drawItemBg(EQUIPPED_SLOT_COLOR, -1, 1.5, ItemSlotType.Hands)
    drawItemBg(EQUIPPED_SLOT_COLOR, 1, 1.5, ItemSlotType.Feet)
    drawItemBg(BONUS_SLOT_COLOR, -1, 3, ItemSlotType.Bonus)
    drawItemBg(BONUS_SLOT_COLOR, 0, 3, ItemSlotType.Bonus)
    drawItemBg(BONUS_SLOT_COLOR, 1, 3, ItemSlotType.Bonus)

    // bags
    const slots = 60
    const cols = 10
    for (let i = 0; i < slots; i++) {
      const x = i % cols
      const y = Math.floor(i / cols)
      drawItemBg(BAG_SLOT_COLOR, x, y)
    }

    // draw bg for bag slots

    // render equipped items

    // render bagged items
  }
}

export default InventoryHud
