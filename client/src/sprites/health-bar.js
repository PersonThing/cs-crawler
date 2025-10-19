import { Container, Graphics, Text } from 'pixi.js'

const HEALTH_BAR_WIDTH = 90
const HEALTH_BAR_HEIGHT = 8
const HEALTH_BAR_OFFSET_Y = -40 // Position above the entity

class HealthBar extends Container {
  constructor() {
    super()

    this.label = ''
    this.healthPercentage = 1.0
    this.maxHealth = 100
    this.currentHealth = 100

    this.createBackground()
    this.createForeground()
    this.createText()

    this.visible = false // Hidden by default, shown when damaged
  }

  createBackground() {
    this.background = new Graphics()
    this.background.rect(0, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT)
    this.background.fill(0x330000) // Dark red background
    this.background.stroke({ color: 0x000000, width: 1 })
    this.addChild(this.background)
  }

  createForeground() {
    this.foreground = new Graphics()
    this.addChild(this.foreground)
  }

  createText() {
    this.healthText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0xffffff,
        dropShadow: true,
        dropShadowDistance: 0,
        dropShadowBlur: 2,
        dropShadowAlpha: 1,
      },
    })
    this.healthText.anchor.set(0.5, 0)
    this.healthText.x = HEALTH_BAR_WIDTH / 2
    this.healthText.y = HEALTH_BAR_HEIGHT
    this.addChild(this.healthText)
  }

  update(label, currentHealth, maxHealth) {
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
    this.foreground.clear()

    const barWidth = HEALTH_BAR_WIDTH * this.healthPercentage

    // Determine color based on health percentage
    let color = 0x008800 // Green for high health
    if (this.healthPercentage < 0.6) {
      color = 0x999900 // Yellow for medium health
    }
    if (this.healthPercentage < 0.3) {
      color = 0x990000 // Red for low health
    }

    this.foreground.rect(0, 0, barWidth, HEALTH_BAR_HEIGHT)
    this.foreground.fill(color)
  }

  updateText() {
    this.healthText.text = `${this.label} ${this.currentHealth}/${this.maxHealth}`
  }

  setPosition(x, y) {
    this.x = x - HEALTH_BAR_WIDTH / 2
    this.y = y + HEALTH_BAR_OFFSET_Y
  }
}

export default HealthBar
