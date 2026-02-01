import { Container, Sprite } from 'pixi.js'
import { ART_SCALE } from '#shared/config/constants.js'

class ProjectileSprite extends Container {
  constructor(projectileData) {
    super()

    this.state = projectileData

    this.initSprite()
    this.updateFromState()
  }

  initSprite() {
    // Create main projectile sprite
    this.projectileSprite = Sprite.from(this.state.texture)
    this.projectileSprite.anchor.set(0.5)
    this.projectileSprite.scale.set(ART_SCALE)
    this.addChild(this.projectileSprite)

    // Set initial z-index
    this.zIndex = 2 // Between ground items (1) and turrets (2.5)
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
  }
}

export default ProjectileSprite
