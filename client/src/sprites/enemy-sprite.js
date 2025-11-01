import { Container, Graphics, Sprite } from 'pixi.js'
import { ART_SCALE, DEBUG } from '#shared/config/constants.js'

class EnemySprite extends Container {
  constructor(enemyData) {
    super()

    this.state = enemyData

    this.initSprite()
    this.updateFromState()

    DEBUG.subscribe(value => {
      if (this.detectionIndicator) {
        this.detectionIndicator.visible = value
      }
      if (this.targetLine) {
        this.targetLine.visible = value
      }
    })
  }

  initSprite() {
    // Create main enemy sprite
    this.enemySprite = Sprite.from(this.state.texture)
    this.enemySprite.anchor.set(0.5)
    this.enemySprite.scale.set(ART_SCALE)
    this.addChild(this.enemySprite)

    // Add shadow below enemy
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

    // Create health bar
    this.createHealthBar()

    this.zIndex = 50 // Enemies render above ground but below players
  }

  createHealthBar() {
    this.healthBarContainer = new Container()
    this.healthBarContainer.y = -40 // Above the enemy

    // Background bar
    this.healthBarBg = new Graphics()
    this.healthBarBg.roundRect(-25, -3, 50, 6, 3)
    this.healthBarBg.fill(0x000000)
    this.healthBarBg.alpha = 0.7
    this.healthBarContainer.addChild(this.healthBarBg)

    // Health bar
    this.healthBar = new Graphics()
    this.healthBarContainer.addChild(this.healthBar)

    this.addChild(this.healthBarContainer)
  }

  updateFromState() {
    if (!this.state) return

    // Update position
    this.x = this.state.x
    this.y = this.state.y

    // Update rotation (enemies face their movement direction)
    if (this.state.rotation !== undefined) {
      this.enemySprite.rotation = this.state.rotation
      this.shadowSprite.rotation = this.state.rotation
    }

    // Update health bar
    this.updateHealthBar()

    // Update debug indicators
    if (DEBUG.value) {
      this.updateDebugIndicators()
    }
  }

  updateHealthBar() {
    if (!this.state || !this.healthBar) return

    const healthPercent = this.state.currentHealth / this.state.maxHealth
    const barWidth = 50
    const healthWidth = barWidth * healthPercent

    this.healthBar.clear()

    if (healthPercent > 0) {
      // Color based on health percentage
      let color = 0x00ff00 // Green
      if (healthPercent < 0.6) color = 0xffff00 // Yellow
      if (healthPercent < 0.3) color = 0xff0000 // Red

      this.healthBar.roundRect(-25, -3, healthWidth, 6, 3)
      this.healthBar.fill(color)
    }

    // Hide health bar if at full health
    this.healthBarContainer.visible = healthPercent < 1.0
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
