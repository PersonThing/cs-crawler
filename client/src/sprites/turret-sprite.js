import { Container, Graphics, Sprite } from 'pixi.js'
import { ART_SCALE, DEBUG } from '#shared/config/constants.js'

class TurretSprite extends Container {
  constructor(turretData) {
    super()

    this.state = turretData
    
    this.initSprite()
    this.updateFromState()

    DEBUG.subscribe(value => {
      if (this.rangeIndicator) {
        this.rangeIndicator.visible = value
      }
    })
  }

  initSprite() {
    // Create main turret sprite
    this.turretSprite = Sprite.from(this.state.texture)
    this.turretSprite.anchor.set(0.5)
    this.turretSprite.scale.set(ART_SCALE)
    this.turretSprite.tint = this.state.color || 0xffffff
    this.addChild(this.turretSprite)

    // Add shadow below turret
    this.shadowSprite = Sprite.from(this.state.texture)
    this.shadowSprite.anchor.set(0.5, 0.4)
    this.shadowSprite.alpha = 0.25
    this.shadowSprite.scale.set(ART_SCALE * 1.2)
    this.shadowSprite.tint = 0x000000
    this.addChildAt(this.shadowSprite, 0)

    // Add range indicator in debug mode
    this.rangeIndicator = new Graphics()
    this.rangeIndicator.circle(0, 0, this.state.range)
    this.rangeIndicator.stroke({
      width: 2,
      color: this.state.color || 0xffffff,
      alpha: 0.6,
    })
    this.rangeIndicator.stroke({ color: 0xffffff, width: 2, alpha: 0.3 })
    this.addChild(this.rangeIndicator)
    this.rangeIndicator.visible = DEBUG.get()

    // Set initial z-index
    this.zIndex = 2.5 // Between projectiles (2) and players (3)
  }

  updateFromState() {
    // Update position
    this.x = this.state.x
    this.y = this.state.y
    this.rotation = this.state.rotation

    // Update shadow rotation to match
    if (this.shadowSprite) {
      this.shadowSprite.rotation = this.state.rotation
    }

    // Update tint if it changed
    if (this.state.color && this.turretSprite.tint !== this.state.color) {
      this.turretSprite.tint = this.state.color
    }
  }
}

export default TurretSprite