import { Container, Graphics, Text } from 'pixi.js'

class AbilityTooltip extends Container {
  constructor() {
    super()
    
    // Prevent tooltip from interfering with mouse events
    this.eventMode = 'none'
    
    this.background = new Graphics()
    this.nameText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold'
      }
    })
    
    this.descriptionText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xcccccc,
        wordWrap: true,
        wordWrapWidth: 200
      }
    })

    // Container for modifier lines (Text objects)
    this.modifierTexts = []
    
    this.addChild(this.background)
    this.addChild(this.nameText)
    this.addChild(this.descriptionText)
    
    this.visible = false
    this.zIndex = 1000 // Ensure tooltip appears on top
  }
  
  show(ability, x, y, modifierInfo = []) {
    if (!ability) return

    // Clear existing modifier text objects
    this.modifierTexts.forEach(t => this.removeChild(t))
    this.modifierTexts = []

    // Update base texts
    this.nameText.text = ability.name || 'Unknown Ability'
    this.descriptionText.text = ability.description || 'No description available'

    const padding = 8
    let currentY = padding

    // Position name
    this.nameText.x = padding
    this.nameText.y = currentY
    currentY += this.nameText.height + 4

    // Position description
    this.descriptionText.x = padding
    this.descriptionText.y = currentY
    currentY += this.descriptionText.height + 6

    // Render modifiers (if any provided)
    if (modifierInfo.length > 0) {
      // Header
      const header = new Text({
        text: 'Modifiers:',
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: 'bold'
        }
      })
      header.x = padding
      header.y = currentY
      this.addChild(header)
      this.modifierTexts.push(header)
      currentY += header.height + 2

      modifierInfo.forEach(mod => {
        const line = new Text({
          text: `- ${mod.name}`,
          style: {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: mod.locked ? 0x666666 : 0x00ff00,
          }
        })
        line.x = padding + 4
        line.y = currentY
        currentY += line.height + 2
        this.addChild(line)
        this.modifierTexts.push(line)
      })
    }

    // Determine width (consider longest line including modifiers)
    const contentWidths = [this.nameText.width, this.descriptionText.width, ...this.modifierTexts.map(t => t.width)]
    const width = Math.max(...contentWidths, 100) + padding * 2
    const height = currentY + padding - 2

    // Redraw background
    this.background.clear()
    this.background
      .rect(0, 0, width, height)
      .fill(0x000000, 0.9)
      .stroke({ color: 0x666666, width: 1 })

    // Position tooltip
    this.x = x
    this.y = y - height - 10

    this.visible = true
  }
  
  hide() {
    this.visible = false
  }
}

export default AbilityTooltip