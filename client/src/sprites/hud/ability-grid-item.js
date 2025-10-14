import { Container, Graphics, Sprite, Text } from 'pixi.js'
import AbilityTooltip from './ability-tooltip.js'

const ITEM_SIZE = 48
const BORDER_COLOR_NORMAL = 0x666666
const BORDER_COLOR_SELECTED = 0x00ff00
const BORDER_COLOR_LOCKED = 0x333333
const FILL_COLOR_NORMAL = 0x222222
const FILL_COLOR_SELECTED = 0x004400
const FILL_COLOR_LOCKED = 0x111111

class AbilityGridItem extends Container {
  constructor(ability, isUnlocked, isSelected, tooltipContainer = null) {
    super()
    
    this.ability = ability
    this.isUnlocked = isUnlocked
    this.isSelected = isSelected
    this.tooltipContainer = tooltipContainer // Parent container to add tooltip to
    
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
    
    // Background
    const borderColor = this.isSelected ? BORDER_COLOR_SELECTED : 
                       this.isUnlocked ? BORDER_COLOR_NORMAL : BORDER_COLOR_LOCKED
    const fillColor = this.isSelected ? FILL_COLOR_SELECTED :
                     this.isUnlocked ? FILL_COLOR_NORMAL : FILL_COLOR_LOCKED
    
    this.bg = new Graphics()
      .rect(0, 0, ITEM_SIZE, ITEM_SIZE)
      .fill(fillColor)
      .stroke({
        color: borderColor,
        width: this.isSelected ? 3 : 2,
      })
    
    this.addChild(this.bg)
    
    // Icon
    if (this.ability.icon) {
      const icon = Sprite.from(this.ability.icon)
      icon.width = ITEM_SIZE - 8
      icon.height = ITEM_SIZE - 8
      icon.x = 4
      icon.y = 4
      
      if (!this.isUnlocked) {
        icon.alpha = 0.3
        icon.tint = 0x666666
      }
      
      this.addChild(icon)
    } else {
      // Fallback text if no icon
      const text = new Text({
        text: this.ability.name.charAt(0),
        style: {
          fontFamily: 'Arial',
          fontSize: 24,
          fill: this.isUnlocked ? 0xffffff : 0x666666,
          align: 'center'
        }
      })
      
      text.x = (ITEM_SIZE - text.width) / 2
      text.y = (ITEM_SIZE - text.height) / 2
      
      this.addChild(text)
    }
    

  }
  
  setupEvents() {
    this.on('pointerdown', (event) => {
      event.stopPropagation()
      
      if (this.isUnlocked) {
        this.emit('select')
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
    if (!this.tooltip || !this.ability) return
    
    // Get the position of this item relative to the tooltip container
    let containerPos = this.tooltipContainer.toLocal(this.toGlobal({ x: 0, y: 0 }))
    
    // Show tooltip positioned relative to the container
    this.tooltip.show(this.ability, containerPos.x, containerPos.y)
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

export default AbilityGridItem