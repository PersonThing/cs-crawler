import { Graphics } from 'pixi.js'
import { DEBUG } from '#shared/config/constants.js'
import EntitySprite from './entity-sprite.js'

class EnemySprite extends EntitySprite {
  constructor(enemyData) {
    // Call EntitySprite constructor with enemy texture and smaller health bar
    const healthBarOptions = {
      width: 50,
      height: 6,
      offsetY: -30,
      showName: false,
    }
    super(enemyData, enemyData.texture, null, null, 0xffffff, healthBarOptions)

    this.addDebugIndicators()

    DEBUG.subscribe(value => {
      if (this.detectionIndicator) {
        this.detectionIndicator.visible = value
      }
      if (this.targetLine) {
        this.targetLine.visible = value
      }
    })
  }

  addDebugIndicators() {
    // Create detection range indicator (debug)
    this.detectionIndicator = new Graphics()
    this.detectionIndicator.circle(0, 0, 300) // Detection range
    this.detectionIndicator.stroke({ color: 0xff0000, width: 1, alpha: 0.2 })
    this.detectionIndicator.visible = DEBUG.value
    this.detectionIndicator.zIndex = -2
    this.addChild(this.detectionIndicator)

    // Create targeting line (debug)
    this.targetLine = new Graphics()
    this.targetLine.visible = DEBUG.value
    this.targetLine.zIndex = -1
    this.addChild(this.targetLine)

    this.zIndex = 50 // Enemies render above ground but below players
  }

  updateFromState() {
    if (!this.state) return

    // Call parent updateFromState to handle position, rotation, health bar
    super.updateFromState()

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
      this.targetLine.stroke({ color: 0xff0000, width: 2, alpha: 0.7 })
    }
  }

  destroy() {
    super.destroy()
  }
}

export default EnemySprite
