import { Container, Graphics, Text } from 'pixi.js'
import AbilityTooltip from './ability-tooltip.js'

const ITEM_HEIGHT = 32
const BORDER_COLOR_NORMAL = 0x666666
const BORDER_COLOR_SELECTED = 0x00ff00
const BORDER_COLOR_LOCKED = 0x333333
const FILL_COLOR_NORMAL = 0x222222
const FILL_COLOR_SELECTED = 0x004400
const FILL_COLOR_LOCKED = 0x111111

class ModifierListItem extends Container {
  constructor(modifier, isUnlocked, isSelected, width, tooltipContainer = null) {
    super()
    
    this.modifier = modifier
    this.isUnlocked = isUnlocked
    this.isSelected = isSelected
    this.ITEM_WIDTH = width
    this.tooltipContainer = tooltipContainer
    
    this.eventMode = 'static'
    this.cursor = 'pointer'
    
    // Create tooltip instance if we have a container to add it to
    if (this.tooltipContainer) {
      this.tooltip = new AbilityTooltip()
      this.tooltipContainer.addChild(this.tooltip)
    }

    this.render()
    this.setupEvents()
  }
  
  render() {
    // Clear existing content
    this.removeChildren()
    
    // Background - same styling as abilities
    const borderColor = this.isSelected ? BORDER_COLOR_SELECTED : 
                       this.isUnlocked ? BORDER_COLOR_NORMAL : BORDER_COLOR_LOCKED
    const fillColor = this.isSelected ? FILL_COLOR_SELECTED :
                     this.isUnlocked ? FILL_COLOR_NORMAL : FILL_COLOR_LOCKED
    
    this.bg = new Graphics()
      .rect(0, 0, this.ITEM_WIDTH, ITEM_HEIGHT)
      .fill(fillColor)
      .stroke({
        color: borderColor,
        width: this.isSelected ? 3 : 2,
      })
    
    this.addChild(this.bg)
    
    // Label
    const label = new Text({
      text: this.modifier.name,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: this.isUnlocked ? 0xffffff : 0x666666,
      }
    })
    
    label.x = 8
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
    if (!this.tooltip || !this.modifier) return

    // Position similar to ability grid items
    let containerPos = this.tooltipContainer.toLocal(this.toGlobal({ x: 0, y: 0 }))

    this.tooltip.show({
      name: this.modifier.name,
      description: this.modifier.description || 'No description available'
    }, containerPos.x, containerPos.y)
  }
  
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.hide()
    }
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

  destroy() {
    if (this.tooltip) {
      this.tooltip.destroy()
      this.tooltip = null
    }
    super.destroy()
  }
}

export default ModifierListItem