import { Graphics, Container, Sprite, Text } from 'pixi.js'
import { Textures } from './textures.js'

const STAT_SIZE = 18
const STAT_MARGIN = 4
const CHARACTER_SHEET_WIDTH = 200
const CHARACTER_SHEET_HEIGHT = 300

const getStatCoordinates = (x, y) => {
  return {
    x: x * (STAT_SIZE + STAT_MARGIN * 2) + STAT_SIZE / 2,
    y: y * (STAT_SIZE + STAT_MARGIN * 2) + 20,
  }
}

class InventoryHud extends Container {
  constructor(app, player) {
    super()

    this.app = app

    this.content = null
    this.renderBackground()

    this.stats = {}

    this.playerStats = player.stats
    this.playerStats.store.subscribe(stats => {
      this.stats = stats
      this.renderStats()
    })

    // kill any click events that bubble through, so player doesn't move when clicking inside character sheet
    this.eventMode = 'static'
    this.on('mousedown', event => {
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }

  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }
    this.bg = new Container()
    this.addChild(this.bg)

    const gfx = new Graphics()
      .roundRect(0, 0, CHARACTER_SHEET_WIDTH, CHARACTER_SHEET_HEIGHT, 6)
      .fill(0x333333)
      .stroke({
        color: 0x555555,
        width: 4,
      })
    gfx.alpha = 0.5
    gfx.x = 0
    gfx.y = 0
    this.bg.addChild(gfx)

    // stats text
    const title = new Text('Character Sheet', {
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: 'bold',
    })
    title.x = 10
    title.y = 10
    this.bg.addChild(title)
  }

  renderStats() {
    // clear old stats
    if (this.statContainer) {
      this.removeChild(this.statContainer)
      this.statContainer.destroy()
    }
    this.statContainer = new Container()
    this.addChild(this.statContainer)

    // render new stats
    Object.keys(this.stats)
      .sort()
      .forEach((statName, index) => {
        const statValue = this.stats[statName]
        const statText = new Text(`${statName}: ${statValue}`, {
          fontSize: 12,
          fill: 0xffffff,
        })
        statText.x = 10
        statText.y = 50 + index * (STAT_SIZE + STAT_MARGIN)
        this.statContainer.addChild(statText)
      })
  }

  setStats(content) {
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
