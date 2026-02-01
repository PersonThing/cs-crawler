import { Graphics } from 'pixi.js'

/**
 * Utility functions for rendering health bars with consistent styling
 */

export function getHealthBarColor(healthPercentage, isEnemy = false) {
  if (isEnemy) {
    // Enemy health bars are always red regardless of health percentage
    return 0x990000
  }
  
  // Player health bars work like they used to - green at full health
  let color = 0x00ff00 // Green for high health
  if (healthPercentage < 0.6) {
    color = 0x999900 // Yellow for medium health
  }
  if (healthPercentage < 0.3) {
    color = 0x990000 // Red for low health
  }
  return color
}

export function renderHealthBar(graphics, currentHealth, maxHealth, width, height, showBackground = true, isEnemy = false) {
  const healthPercentage = maxHealth > 0 ? currentHealth / maxHealth : 0
  const cornerRadius = 3 // Rounded corners like enemy health bars

  graphics.clear()

  // Draw background if requested
  if (showBackground) {
    graphics.roundRect(0, 0, width, height, cornerRadius)
    graphics.fill(0x330000) // Dark red background
    graphics.stroke({ color: 0x000000, width: 1 })
  }

  // Draw foreground health bar
  const barWidth = width * healthPercentage
  const color = getHealthBarColor(healthPercentage, isEnemy)

  if (barWidth > 0) {
    graphics.roundRect(0, 0, barWidth, height, cornerRadius)
    graphics.fill(color)
  }

  return healthPercentage
}

export function createHealthBarGraphics() {
  return new Graphics()
}
