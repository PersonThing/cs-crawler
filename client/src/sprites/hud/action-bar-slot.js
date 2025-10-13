import { Container, Graphics, Sprite, Text } from 'pixi.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities.js'

const SLOT_SIZE = 48
const KEY_LABELS = ['LClick', 'RClick', 'Q', 'W', 'E', 'R']
const BORDER_COLOR = 0x666666
const BORDER_COLOR_LOCKED = 0x444444
const FILL_COLOR = 0x222222
const FILL_COLOR_LOCKED = 0x111111

class ActionBarSlot extends Container {
  constructor(index, config) {
    super()
    
    this.index = index
    this.config = config || { abilityId: null, modifiers: [] }
    this.unlockedAbilities = []
    this.unlockedModifiers = []
    
    this.eventMode = 'static'
    this.cursor = 'pointer'
    
    this.renderBackground()
    this.renderContent()
    this.setupEvents()
  }
  
  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }
    
    const isLocked = this.config.abilityId && !this.unlockedAbilities.includes(this.config.abilityId)
    
    this.bg = new Graphics()
      .rect(0, 0, SLOT_SIZE, SLOT_SIZE)
      .fill(isLocked ? FILL_COLOR_LOCKED : FILL_COLOR)
      .stroke({
        color: BORDER_COLOR,
        width: 2,
      })
    
    this.addChild(this.bg)
  }
  
  renderContent() {
    // Clear existing content
    if (this.contentContainer) {
      this.removeChild(this.contentContainer)
      this.contentContainer.destroy()
    }
    
    this.contentContainer = new Container()
    this.addChild(this.contentContainer)
    
    if (!this.config.abilityId) {
      this.renderEmptySlot()
      return
    }
    
    const ability = Abilities[this.config.abilityId]
    if (!ability) return
    
    const isLocked = !this.unlockedAbilities.includes(this.config.abilityId)
    
    // Render ability icon
    if (ability.icon) {
      const icon = Sprite.from(ability.icon)
      icon.width = SLOT_SIZE - 8
      icon.height = SLOT_SIZE - 8
      icon.x = 4
      icon.y = 4
      

      
      this.contentContainer.addChild(icon)
    }
    
    // Render modifier indicators
    if (this.config.modifiers.length > 0) {
      this.renderModifierIndicators(isLocked)
    }
    
    // Render keybind label
    this.renderKeybind()
  }
  
  renderEmptySlot() {
    // Show keybind label in bottom right (same as filled slots)
    this.renderKeybind()
  }
  
  renderModifierIndicators(abilityLocked) {
    const modifierSize = 8
    const spacing = 2
    
    this.config.modifiers.forEach((modifierId, index) => {
      const modifier = AbilityModifiers[modifierId]
      if (!modifier) return
      
      const isModifierLocked = !this.unlockedModifiers.includes(modifierId)
      
      // Small colored dot to indicate modifier
      const dot = new Graphics()
        .circle(0, 0, modifierSize / 2)
        .fill(isModifierLocked || abilityLocked ? 0x444444 : 0x00ff00)
      
      dot.x = SLOT_SIZE - modifierSize - 2
      dot.y = 2 + modifierSize + (index * (modifierSize + spacing))
      
      this.contentContainer.addChild(dot)
    })
  }
  
  renderKeybind() {
    // Show keybind label in bottom right
    const text = new Text({
      text: KEY_LABELS[this.index],
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0x999999,
        fontWeight: 'bold'
      }
    })
    
    text.x = SLOT_SIZE - text.width - 2
    text.y = SLOT_SIZE - text.height - 2
    
    this.contentContainer.addChild(text)
  }
  
  setupEvents() {
    // Helper to stop all events from propagating
    const stopEvent = (event) => {
      event.stopPropagation()
      event.preventDefault()
      return false
    }
    
    this.on('pointerdown', (event) => {
      stopEvent(event)
      
      if (event.button === 0) { // Left click
        if (event.shiftKey) { // Shift + Left click - clear binding
          this.emit('clear')
        } else {
          this.emit('click')
        }
      } else if (event.button === 1) { // Middle click - clear binding
        this.emit('clear')
      } else if (event.button === 2) { // Right click
        this.emit('rightclick')
      }
    })
    this.on('pointerover', () => {
      this.showTooltip()
    })
    this.on('pointerout', () => {
      this.hideTooltip()
    })
  }
  
  showTooltip() {
    if (!this.config.abilityId) return
    
    const ability = Abilities[this.config.abilityId]
    if (!ability) return
    
    // TODO: Create and show tooltip with ability name, description, and modifiers
    console.log('Show tooltip for:', ability.name)
  }
  
  hideTooltip() {
    // TODO: Hide tooltip
  }
  
  updateConfig(newConfig) {
    this.config = { ...newConfig }
    this.renderBackground() // This should preserve highlight state via this.isHighlighted
    this.renderContent()
  }
  
  updateUnlockedState(unlockedAbilities, unlockedModifiers) {
    this.unlockedAbilities = unlockedAbilities
    this.unlockedModifiers = unlockedModifiers
    this.renderBackground()
    this.renderContent()
  }
  
  tick() {
    // TODO: Update cooldown display, etc.
  }
}

export default ActionBarSlot