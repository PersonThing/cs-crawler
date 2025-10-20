import { Container, Graphics, Sprite } from 'pixi.js'
import { ART_SCALE, DEBUG } from '#shared/config/constants.js'

class PetSprite extends Container {
  constructor(petData) {
    super()

    this.state = petData
    
    this.initSprite()
    this.updateFromState()

    DEBUG.subscribe(value => {
      if (this.leashIndicator) {
        this.leashIndicator.visible = value
      }
      if (this.detectionIndicator) {
        this.detectionIndicator.visible = value
      }
    })
  }

  initSprite() {
    // Create main pet sprite
    this.petSprite = Sprite.from(this.state.texture)
    this.petSprite.anchor.set(0.5)
    this.petSprite.scale.set(ART_SCALE)
    this.petSprite.tint = this.state.color || 0xffffff
    this.addChild(this.petSprite)

    // Add shadow below pet
    this.shadowSprite = Sprite.from(this.state.texture)
    this.shadowSprite.anchor.set(0.5, 0.4)
    this.shadowSprite.alpha = 0.25
    this.shadowSprite.tint = 0x000000
    this.shadowSprite.scale.set(ART_SCALE * 0.9)
    this.shadowSprite.y = 4
    this.shadowSprite.zIndex = -1
    this.addChild(this.shadowSprite)

    // Create detection range indicator (debug)
    this.detectionIndicator = new Graphics()
    this.detectionIndicator.circle(0, 0, this.state.range)
    this.detectionIndicator.stroke({ color: 0xff6600, width: 1, alpha: 0.2 })
    this.detectionIndicator.visible = DEBUG.value
    this.detectionIndicator.zIndex = -3
    this.addChild(this.detectionIndicator)

    // Create leash radius indicator (debug)
    this.leashIndicator = new Graphics()
    this.leashIndicator.circle(0, 0, this.state.leashDistance)
    this.leashIndicator.stroke({ color: 0x00ff00, width: 1, alpha: 0.3 })
    this.leashIndicator.visible = DEBUG.value
    this.leashIndicator.zIndex = -2
    this.addChild(this.leashIndicator)

    // Create targeting line (debug)
    this.targetLine = new Graphics()
    this.targetLine.visible = DEBUG.value
    this.targetLine.zIndex = -1
    this.addChild(this.targetLine)

    this.zIndex = 100 // Pets render above ground but below players
  }

  updateFromState() {
    if (!this.state) return

    // Update position
    this.x = this.state.x
    this.y = this.state.y

    // Update rotation (pets face their movement direction)
    if (this.state.rotation !== undefined) {
      this.petSprite.rotation = this.state.rotation
      this.shadowSprite.rotation = this.state.rotation
    }

    // Update debug indicators
    if (DEBUG.value) {
      this.updateDebugIndicators()
    }
  }

  updateDebugIndicators() {
    // Update targeting line
    this.targetLine.clear()
    if (this.state.target && this.state.target.x !== undefined && this.state.target.y !== undefined) {
      const dx = this.state.target.x - this.state.x
      const dy = this.state.target.y - this.state.y
      this.targetLine.moveTo(0, 0)
      this.targetLine.lineTo(dx, dy)
      this.targetLine.stroke({ color: 0xff0000, width: 1, alpha: 0.5 })
    }

    // Update leash indicator to show current leash status
    this.leashIndicator.clear()
    this.leashIndicator.circle(0, 0, this.state.leashDistance)
    
    // Update detection range indicator
    this.detectionIndicator.clear()
    this.detectionIndicator.circle(0, 0, this.state.range)
    this.detectionIndicator.stroke({ color: 0xff6600, width: 1, alpha: 0.2 })
    
    // Color the leash indicator based on distance from owner
    if (this.state.owner) {
      const dx = this.state.x - this.state.owner.x
      const dy = this.state.y - this.state.owner.y
      const distanceFromOwner = Math.sqrt(dx * dx + dy * dy)
      
      if (distanceFromOwner > this.state.leashDistance * 0.8) {
        // Close to leash limit - red
        this.leashIndicator.stroke({ color: 0xff0000, width: 2, alpha: 0.5 })
      } else if (distanceFromOwner > this.state.leashDistance * 0.6) {
        // Getting far - yellow
        this.leashIndicator.stroke({ color: 0xffff00, width: 1, alpha: 0.4 })
      } else {
        // Normal range - green
        this.leashIndicator.stroke({ color: 0x00ff00, width: 1, alpha: 0.3 })
      }
    }
  }

  destroy() {
    super.destroy()
  }
}

export default PetSprite