import { Container, Graphics, Sprite } from 'pixi.js'
import { ART_SCALE } from '#shared/config/constants.js'
import InventorySlot from '#shared/config/inventory-slot'
import HealthBar from './health-bar.js'
import RiggedPlayerModel from './rigged-player-model.js'
import soundManager from '../sound-manager.js'
import { Sounds } from '#shared/config/sounds.js'

class PlayerSprite extends Container {
  constructor(playerState, texture, world, pather, color) {
    super()

    this.state = playerState
    this.entityTexture = texture
    this.world = world
    this.pather = pather
    this.color = color || 0xffffff

    this.attachedItems = {}
    this.isMoving = false
    this.stepSound = null
    this.lastPosition = { x: playerState.x, y: playerState.y }

    this.initSprite()
    this.updateFromState()
  }

  initSprite() {
    // Create the sprite container (rotates with player facing direction)
    this.spriteContainer = new Container()
    this.spriteContainer.scale.x = ART_SCALE
    this.spriteContainer.scale.y = ART_SCALE
    this.addChild(this.spriteContainer)

    // Create the rigged model instead of a flat texture
    this.riggedModel = new RiggedPlayerModel(this.color)
    this.spriteContainer.addChild(this.riggedModel)

    // Create health bar
    this.healthBar = new HealthBar()
    this.healthBar.setPosition(0, 0)
    this.addChild(this.healthBar)

    // Create shadow as a simple oval
    this.shadowGraphics = new Graphics()
    this.shadowGraphics.ellipse(0, 0, 12, 6).fill(0x000000)
    this.shadowGraphics.alpha = 0.3
    this.shadowGraphics.y = 4
    this.addChildAt(this.shadowGraphics, 0)
  }

  updateFromState() {
    if (this.state == null) return
    try {
      this.x = this.state.x
      this.y = this.state.y
      this.spriteContainer.rotation = this.state.rotation
      this.updateEquippedItems()

      // Update health bar
      if (this.healthBar && this.state.currentHealth !== undefined && this.state.maxHealth !== undefined) {
        this.healthBar.update(this.state.isLocalPlayer, this.state.label, this.state.currentHealth, this.state.maxHealth)
      }

      // Detect movement for walking animation and step sounds
      const currentlyMoving =
        Math.abs(this.state.x - this.lastPosition.x) > 0.1 ||
        Math.abs(this.state.y - this.lastPosition.y) > 0.1

      // Update the rigged model animation
      this.riggedModel.update(currentlyMoving, 16) // ~16ms per frame at 60fps

      // Handle step sounds for local player
      if (this.isLocalPlayer) {
        this.updateStepSound(currentlyMoving)
      }

      this.lastPosition.x = this.state.x
      this.lastPosition.y = this.state.y
    } catch (e) {
      console.warn('Error updating PlayerSprite from state:', e)
    }
  }

  updateEquippedItems() {
    if (this.renderedInventorySequence === this.state.inventory.sequence) {
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
        ([slot, item]) => item != null && item.equippedTexture != null && !slot?.startsWith('Bonus')
      )
      .forEach(([slot, item]) => this.attachItemSprite(item.equippedTexture, slot))

    this.renderedInventorySequence = this.state.inventory.sequence
  }

  attachItemSprite(texture, slotName) {
    const itemSprite = Sprite.from(texture)
    itemSprite.anchor.set(0.5)

    if (slotName === InventorySlot.OffHand.name) {
      itemSprite.scale.x = -1
    }

    this.attachedItems[slotName] = itemSprite
    this.spriteContainer.addChild(itemSprite)
  }

  animateAttack() {
    const originalScale = this.spriteContainer.scale.x
    this.spriteContainer.scale.set(originalScale * 1.2)

    setTimeout(() => {
      this.spriteContainer.scale.set(originalScale)
    }, 100)
  }

  updateStepSound(currentlyMoving) {
    if (currentlyMoving && !this.isMoving) {
      this.isMoving = true
      this.stepSound = soundManager.play(Sounds.Stepping, { volume: 0.6 })
      if (this.stepSound) {
        this.stepSound.loop = true
      }
    } else if (!currentlyMoving && this.isMoving) {
      this.isMoving = false
      if (this.stepSound) {
        this.stepSound.pause()
        this.stepSound.currentTime = 0
        this.stepSound = null
      }
    }
  }

  destroy() {
    if (this.stepSound) {
      this.stepSound.pause()
      this.stepSound.currentTime = 0
      this.stepSound = null
    }
    super.destroy()
  }
}

export default PlayerSprite
