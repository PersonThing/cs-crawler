import { Container, Graphics, Text } from 'pixi.js'

const ITEM_WIDTH = 160
const ITEM_HEIGHT = 28
const CHECKBOX_SIZE = 16

class ModifierListItem extends Container {
  constructor(modifier, isUnlocked, isSelected) {
    super()
    
    this.modifier = modifier
    this.isUnlocked = isUnlocked
    this.isSelected = isSelected
    
    this.eventMode = 'static'
    this.cursor = 'pointer'
    
    this.render()
    this.setupEvents()
  }
  
  render() {
    // Clear existing content
    this.removeChildren()
    
    // Background
    const fillColor = this.isUnlocked ? 0x222222 : 0x111111
    
    this.bg = new Graphics()
      .rect(0, 0, ITEM_WIDTH, ITEM_HEIGHT)
      .fill(fillColor)
      .stroke({
        color: this.isUnlocked ? 0x666666 : 0x333333,
        width: 1,
      })
    
    this.addChild(this.bg)
    
    // Checkbox
    this.checkbox = new Graphics()
      .rect(4, (ITEM_HEIGHT - CHECKBOX_SIZE) / 2, CHECKBOX_SIZE, CHECKBOX_SIZE)
      .fill(this.isSelected && this.isUnlocked ? 0x00aa00 : 0x444444)
      .stroke({
        color: this.isUnlocked ? 0x888888 : 0x444444,
        width: 1,
      })
    
    this.addChild(this.checkbox)
    
    // Checkmark
    if (this.isSelected && this.isUnlocked) {
      const checkmark = new Text({
        text: '✓',
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xffffff,
          align: 'center'
        }
      })
      
      checkmark.x = 4 + (CHECKBOX_SIZE - checkmark.width) / 2
      checkmark.y = (ITEM_HEIGHT - checkmark.height) / 2
      
      this.addChild(checkmark)
    }
    
    // Label
    const label = new Text({
      text: this.modifier.name,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: this.isUnlocked ? 0xffffff : 0x666666,
      }
    })
    
    label.x = 4 + CHECKBOX_SIZE + 8
    label.y = (ITEM_HEIGHT - label.height) / 2
    
    this.addChild(label)
    

  }
  
  setupEvents() {
    this.on('pointerdown', (event) => {
      event.stopPropagation()
      
      if (this.isUnlocked) {
        this.emit('toggle')
      }
    })
    
    this.on('pointerover', () => {
      if (this.isUnlocked) {
        this.bg.tint = 0xcccccc
      }
      this.showTooltip()
    })
    
    this.on('pointerout', () => {
      this.bg.tint = 0xffffff
      this.hideTooltip()
    })
  }
  
  showTooltip() {
    // TODO: Show tooltip with modifier description
    console.log('Show tooltip for modifier:', this.modifier.name, this.modifier.description)
  }
  
  hideTooltip() {
    // TODO: Hide tooltip
  }
  
  setSelected(selected) {
    if (this.isSelected !== selected) {
      this.isSelected = selected
      this.render()
    }
  }
  
  setUnlocked(unlocked) {
    if (this.isUnlocked !== unlocked) {
      this.isUnlocked = unlocked
      this.render()
    }
  }
}

export default ModifierListItem