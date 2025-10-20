import { Container, Graphics, Sprite, Text } from 'pixi.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities/abilities.js'
import AbilityTooltip from './ability-tooltip.js'

const SLOT_SIZE = 48
const KEY_LABELS = ['Shift\nLClick', 'RClick', 'Q', 'W', 'E', 'R']
const BORDER_COLOR = 0x666666
const BORDER_COLOR_LOCKED = 0x444444
const FILL_COLOR = 0x222222
const FILL_COLOR_LOCKED = 0x111111

class ActionBarSlot extends Container {
  constructor(index, config, tooltipContainer = null) {
    super()
    
    this.index = index
    this.config = config || { abilityId: null, modifiers: [] }
    this.unlockedAbilities = []
    this.unlockedModifiers = []
    this.tooltipContainer = tooltipContainer
    
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.sortableChildren = true // Enable z-index sorting
    
    // Create tooltip instance if we have a container to add it to
    if (this.tooltipContainer) {
      this.tooltip = new AbilityTooltip()
      this.tooltipContainer.addChild(this.tooltip)
    }
    
    this.renderBackground()
    this.renderContent()
    this.renderCooldownOverlay()
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
    this.contentContainer.eventMode = 'none' // Prevent child events from interfering
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
      
      // Desaturate and dim locked abilities
      if (isLocked) {
        icon.alpha = 0.3
        icon.tint = 0x666666
      } else {
        icon.alpha = 1.0
        icon.tint = 0xffffff
      }
      
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
    // Remove any previous modifier label container if exists
    if (this.modifierLabelContainer) {
      this.contentContainer.removeChild(this.modifierLabelContainer)
      this.modifierLabelContainer.destroy({ children: true })
    }

    this.modifierLabelContainer = new Container()
    this.modifierLabelContainer.eventMode = 'none'
    this.contentContainer.addChild(this.modifierLabelContainer)

    const maxWidth = SLOT_SIZE - 6 // leave some padding
    const startX = SLOT_SIZE - 2 // we will right-align each label
    const startY = 2
    const lineHeight = 9 // very small stacked lines

    this.config.modifiers.forEach((modifierId, index) => {
      const modifier = AbilityModifiers[modifierId]
      if (!modifier) return

      const isModifierLocked = abilityLocked || !this.unlockedModifiers.includes(modifierId)

      // Use a short name. Prefer explicit shortName property if provided, else take first 3-4 chars.
      let label = modifier.shortName || modifier.name || modifierId || ''
      if (label.length > 4) {
        label = label.substring(0, 4)
      }

      const text = new Text({
        text: label,
        style: {
          fontFamily: 'Arial',
          fontSize: 9,
          fill: isModifierLocked ? 0x555555 : 0xeeeeee,
        }
      })

      // If too wide, truncate with ellipsis (single char) until fits
      while (text.width > maxWidth && label.length > 1) {
        label = label.substring(0, label.length - 1)
        text.text = label
      }

      text.x = startX - text.width // right align
      text.y = startY + index * lineHeight

      this.modifierLabelContainer.addChild(text)
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
        fontWeight: 'bold',
        textAlign: 'right',
      }
    })
    
    text.x = 2//SLOT_SIZE - text.width - 2
    text.y = SLOT_SIZE - text.height - 2
    
    this.contentContainer.addChild(text)
  }

  renderCooldownOverlay() {
    if (this.cooldownOverlay) {
      this.removeChild(this.cooldownOverlay)
      this.cooldownOverlay.destroy()
    }

    this.cooldownOverlay = new Graphics()
    this.cooldownOverlay.alpha = 0.7
    this.cooldownOverlay.visible = false
    this.cooldownOverlay.zIndex = 1000 // Make sure it's on top
    
    // Create a square mask to clip the circle to slot boundaries
    const mask = new Graphics()
    mask.rect(2, 2, SLOT_SIZE - 4, SLOT_SIZE - 4) // Account for 2px border
    mask.fill(0xffffff)
    this.cooldownOverlay.mask = mask
    this.addChild(mask)
    this.addChild(this.cooldownOverlay)

    if (this.cooldownText) {
      this.removeChild(this.cooldownText)
      this.cooldownText.destroy()
    }

    this.cooldownText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 2,
          alpha: 0.8,
          distance: 0
        }
      }
    })
    this.cooldownText.alpha = 1
    this.cooldownText.anchor.set(0.5)
    this.cooldownText.x = SLOT_SIZE / 2
    this.cooldownText.y = SLOT_SIZE / 2
    this.cooldownText.visible = false
    this.cooldownText.zIndex = 1001 // Above overlay
    this.addChild(this.cooldownText)

    // Create entity count text (for turrets/pets)
    if (this.entityCountText) {
      this.removeChild(this.entityCountText)
      this.entityCountText.destroy()
    }

    this.entityCountText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0x00ff00,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 2,
          alpha: 0.8,
          distance: 1
        }
      }
    })
    this.entityCountText.anchor.set(1, 0) // Top-right anchor
    this.entityCountText.x = SLOT_SIZE - 2
    this.entityCountText.y = 2
    this.entityCountText.visible = false
    this.entityCountText.zIndex = 1002 // Above everything
    this.addChild(this.entityCountText)
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
    if (!this.tooltip || !this.config.abilityId) return
    
    const ability = Abilities[this.config.abilityId]
    if (!ability) return
    
    // Get global position of this slot
    const globalPos = this.toGlobal({ x: 0, y: 0 })
    
    // Build modifier info list (preserve locked modifiers but grey them)
    const modifierInfo = (this.config.modifiers || []).map(modId => {
      const mod = AbilityModifiers[modId]
      if (!mod) return null
      const locked = !this.unlockedModifiers.includes(modId) || !this.unlockedAbilities.includes(this.config.abilityId)
      return { id: modId, name: mod.name || modId, locked }
    }).filter(Boolean)
    
    // Show tooltip positioned relative to this slot including modifiers
    this.tooltip.show(ability, globalPos.x, globalPos.y, modifierInfo)
  }
  
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.hide()
    }
  }
  
  updateConfig(newConfig) {
    this.config = newConfig
    this.renderBackground() // This should preserve highlight state via this.isHighlighted
    this.renderContent()
    this.renderCooldownOverlay()
  }
  
  updateUnlockedState(unlockedAbilities, unlockedModifiers) {
    // Only re-render if the unlocked state actually changed
    const abilitiesChanged = JSON.stringify(this.unlockedAbilities) !== JSON.stringify(unlockedAbilities)
    const modifiersChanged = JSON.stringify(this.unlockedModifiers) !== JSON.stringify(unlockedModifiers)
    
    if (!abilitiesChanged && !modifiersChanged) {
      return // No change, skip re-rendering
    }
    
    this.unlockedAbilities = unlockedAbilities
    this.unlockedModifiers = unlockedModifiers
    this.renderBackground()
    this.renderContent()
    this.renderCooldownOverlay()
  }
  
  tick(playerState) {
    if (!this.config.abilityId || !playerState) {
      this.cooldownOverlay.visible = false
      this.cooldownText.visible = false
      return
    }

    const ability = Abilities[this.config.abilityId]
    if (!ability) {
      this.cooldownOverlay.visible = false
      this.cooldownText.visible = false
      return
    }

    const cooldownRemaining = playerState.getAbilityCooldownRemaining ? 
      playerState.getAbilityCooldownRemaining(this.config.abilityId) : 0

    if (cooldownRemaining > 0) {
      // Show cooldown overlay
      this.cooldownOverlay.visible = true
      this.cooldownText.visible = true

      // Update overlay graphics (radial fill based on remaining cooldown)
      const totalCooldown = ability.cooldown
      const progress = cooldownRemaining / totalCooldown
      
      this.cooldownOverlay.clear()
      
      // Draw remaining cooldown as a radial fill covering the whole square
      if (progress > 0) {
        const centerX = SLOT_SIZE / 2
        const centerY = SLOT_SIZE / 2
        const startAngle = -Math.PI / 2 // Start at top
        const endAngle = startAngle + (2 * Math.PI * progress)
        const radius = SLOT_SIZE // Large enough to cover the entire square

        // Draw a large circle and let the square boundaries mask it
        this.cooldownOverlay.moveTo(centerX, centerY)
        this.cooldownOverlay.arc(centerX, centerY, radius, startAngle, endAngle)
        this.cooldownOverlay.lineTo(centerX, centerY)
        this.cooldownOverlay.fill(0x000000)
      }

      // Update cooldown text
      const seconds = Math.ceil(cooldownRemaining / 1000)
      this.cooldownText.text = seconds.toString()
    } else {
      // Hide cooldown overlay
      this.cooldownOverlay.visible = false
      this.cooldownText.visible = false
    }

    // Show entity count if this ability has Turret or Pet modifier
    const hasTurretModifier = this.config.modifiers && this.config.modifiers.includes(AbilityModifiers.Turret.id)
    const hasPetModifier = this.config.modifiers && this.config.modifiers.includes(AbilityModifiers.Pet.id)
    
    if ((hasTurretModifier || hasPetModifier) && playerState) {
      let entityCount = 0
      
      if (hasTurretModifier && playerState.turretCounts) {
        entityCount += playerState.turretCounts[this.config.abilityId] || 0
      }
      
      if (hasPetModifier && playerState.petCounts) {
        entityCount += playerState.petCounts[this.config.abilityId] || 0
      }
      
      if (entityCount > 0) {
        this.entityCountText.text = entityCount.toString()
        this.entityCountText.visible = true
      } else {
        this.entityCountText.visible = false
      }
    } else {
      this.entityCountText.visible = false
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

export default ActionBarSlot