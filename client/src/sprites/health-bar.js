import { Container, Graphics, Text } from 'pixi.js'
import { renderHealthBar, createHealthBarGraphics } from '../utils/health-bar-renderer.js'
import { LOCAL_PLAYER_COLOR, OTHER_PLAYER_COLOR } from '#shared/config/constants'

const DEFAULT_HEALTH_BAR_WIDTH = 90
const DEFAULT_HEALTH_BAR_HEIGHT = 8
const DEFAULT_HEALTH_BAR_OFFSET_Y = -40 // Position above the entity

class HealthBar extends Container {
  constructor(healthBarOptions) {
    super()
    this.options = healthBarOptions || {}
    this.options.width = this.options.width || DEFAULT_HEALTH_BAR_WIDTH
    this.options.height = this.options.height || DEFAULT_HEALTH_BAR_HEIGHT
    this.options.offsetY = this.options.offsetY || DEFAULT_HEALTH_BAR_OFFSET_Y
    this.showName = this.options.showName !== undefined ? this.options.showName : true
    this.isEnemy = this.options.isEnemy || false

    this.label = ''
    this.healthPercentage = 1.0
    this.maxHealth = 100
    this.currentHealth = 100

    this.createBackground()
    this.createForeground()
    this.createText()

    this.visible = true //false // Hidden by default, shown when damaged
  }

  createBackground() {
    this.background = new Graphics()
    this.background.roundRect(0, 0, this.options.width, this.options.height, 3)
    this.background.fill(0x000000) // Dark background
    this.background.alpha = 0.7
    this.addChild(this.background)
  }

  createForeground() {
    this.foreground = createHealthBarGraphics()
    this.addChild(this.foreground)
  }

  createText() {
    if (!this.showName) return

    this.healthText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: this.isLocalPlayer ? LOCAL_PLAYER_COLOR : OTHER_PLAYER_COLOR,
        dropShadow: true,
        dropShadowDistance: 0,
        dropShadowBlur: 2,
        dropShadowAlpha: 1,
      },
    })
    this.healthText.anchor.set(0.5, 0)
    this.healthText.x = this.options.width / 2
    this.healthText.y = this.options.height
    this.addChild(this.healthText)
  }

  update(isLocalPlayer, label, currentHealth, maxHealth) {
    this.isLocalPlayer = isLocalPlayer
    this.label = label
    this.currentHealth = currentHealth
    this.maxHealth = maxHealth
    this.healthPercentage = maxHealth > 0 ? currentHealth / maxHealth : 0

    // Show health bar if not at full health
    this.visible = true //this.healthPercentage < 1.0

    if (this.visible) {
      this.updateBar()
      this.updateText()
    }
  }

  updateBar() {
    renderHealthBar(
      this.foreground,
      this.currentHealth,
      this.maxHealth,
      this.options.width,
      this.options.height,
      false, // Don't render background since we have a separate background graphics
      this.isEnemy
    )
  }

  updateText() {
    if (!this.showName) return

    this.healthText.text = `${this.label} ${this.currentHealth}/${this.maxHealth}`
    this.healthText.style.fill = this.isLocalPlayer ? LOCAL_PLAYER_COLOR : OTHER_PLAYER_COLOR
  }

  setPosition(x, y) {
    this.x = x - this.options.width / 2
    this.y = y + this.options.offsetY
  }
}

export default HealthBar
