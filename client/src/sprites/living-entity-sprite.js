import { Container, Sprite, Graphics, Text } from 'pixi.js'
import { ART_SCALE } from '#shared/config/constants.js'
import InventorySlot from '#shared/config/inventory-slot'

class LivingEntitySprite extends Container {
  constructor(state, texture, world, pather, color) {
    super()

    this.state = state
    this.entityTexture = texture
    this.world = world
    this.pather = pather
    this.color = color || 0xffffff

    this.sprite = null
    this.healthBar = null
    this.labelText = null
    this.attachedItems = {}
    this.pathLine = null

    this.initSprite()
    this.updateFromState()
  }

  initSprite() {
    // Create main sprite
    this.spriteContainer = new Container()
    this.spriteContainer.scale.x = ART_SCALE
    this.spriteContainer.scale.y = ART_SCALE
    this.sprite = Sprite.from(this.entityTexture)
    this.sprite.anchor.set(0.5)
    this.spriteContainer.addChild(this.sprite)
    this.addChild(this.spriteContainer)

    // Create label
    this.labelSprite = new Text({
      text: this.state.label,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: this.color,
        align: 'center',
        dropShadow: true,
        dropShadowDistance: 1,
        dropShadowBlur: 1,
        dropShadowAlpha: 1,
      },
    })
    this.labelSprite.anchor.set(0.5, 2.5)
    this.addChild(this.labelSprite)

    // add a shadow below
    this.shadowSprite = Sprite.from(this.entityTexture)
    this.shadowSprite.anchor.set(0.5, 0.4)
    this.shadowSprite.alpha = 0.25
    this.shadowSprite.scale.x = ART_SCALE * 1.5
    this.shadowSprite.scale.y = ART_SCALE * 1.5
    this.shadowSprite.tint = 0x000000
    this.addChildAt(this.shadowSprite, 0)
  }

  onTick(time) {
    // this.state.onTick(time)
    this.updateFromState()
  }

  updateFromState() {
    if (this.state == null) return
    if (this == null) return

    // Update position
    this.x = this.state.x
    this.y = this.state.y
    this.target = this.state.target
    this.tempTarget = this.state.tempTarget
    this.spriteContainer.rotation = this.state.rotation
    this.labelSprite.text = this.state.label

    // Update equipped items
    this.updateEquippedItems()
  }

  updateEquippedItems() {
    // don't update if nothing changed
    if (this.renderedInventoryHash === this.state.inventory.hash) {
      return
    }
    
    // Remove old attached items
    Object.values(this.attachedItems).forEach(item => {
      this.spriteContainer.removeChild(item)
      item.destroy()
    })
    this.attachedItems = {}

    // Add new equipped items
    Object.entries(this.state.inventory.equipped)
      .filter(
        // only non-bonus slots with an item that has an equippedTexture
        ([slot, item]) => item != null && item.equippedTexture != null && !slot?.startsWith('Bonus')
      )
      .forEach(([slot, item]) => this.attachItemSprite(item.equippedTexture, slot))

    // update rendered hash
    this.renderedInventoryHash = this.state.inventory.hash
  }

  attachItemSprite(texture, slotName) {
    const itemSprite = Sprite.from(texture)
    itemSprite.anchor.set(0.5)

    // flip the sprite if offhand
    if (slotName === InventorySlot.OffHand.name) {
      itemSprite.scale.x = -1
    }

    this.attachedItems[slotName] = itemSprite
    this.spriteContainer.addChild(itemSprite)
  }

  animateAttack() {
    // Simple attack animation for testing
    const originalScale = this.sprite.scale.x
    this.spriteContainer.scale.set(originalScale * 1.2)

    setTimeout(() => {
      this.spriteContainer.scale.set(originalScale)
    }, 100)
  }

  // drawPathLine() {
  //   this.clearPathLine()
  //   if (!this.state.path || this.state.path.length === 0) return

  //   this.pathLine = new Graphics()

  //   this.pathLine.moveTo(this.state.x, this.state.y)
  //   this.state.path.forEach(point => {
  //     this.pathLine.lineTo(point.x, point.y)
  //   })
  //   this.pathLine.stroke({ color: this.color, width: 2, alpha: 0.5 })

  //   this.world.addChild(this.pathLine)
  // }

  // clearPathLine() {
  //   if (this.pathLine) {
  //     this.world.removeChild(this.pathLine)
  //     this.pathLine.destroy()
  //     this.pathLine = null
  //   }
  // }
}

export default LivingEntitySprite
