import { Container, Graphics, Sprite, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities.js'
import InventoryStatCalculator from '#shared/utils/inventory-stat-calculator.js'
import playerSpriteStore from '../../stores/player-sprite-store.js'
import ActionBarSlot from './action-bar-slot.js'
import AbilitySelectionMenu from './ability-selection-menu.js'

const SLOT_COUNT = 6
const SLOT_SIZE = 48
const SLOT_PADDING = 4
const MARGIN = 8

class ActionBarHud extends Container {
  constructor(app) {
    super()

    this.app = app
    this.slots = []
    this.selectedSlotIndex = null
    this.abilityMenu = null
    
    // Action bar configuration (persisted across sessions)
    this.slotConfigs = Array(SLOT_COUNT).fill(null).map(() => ({
      abilityId: null,
      modifiers: []
    }))

    this.renderBackground()
    this.renderSlots()
    this.positionAtBottom()

    // Listen for player changes to update unlocked abilities
    this.unsubscribeFromPlayers = playerSpriteStore.subscribe(players => {
      const player = players.find(p => p.isLocalPlayer)
      this.updateUnlockedAbilities(player?.state?.stats || {})
    })

    // Kill any click events that bubble through
    this.eventMode = 'static'
    this.on('pointerdown', event => {
      // Close menu if clicking on action bar background (not on slots)
      if (this.abilityMenu && event.target === this.bg) {
        this.closeAbilityMenu()
      }
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }

  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }

    const width = SLOT_COUNT * (SLOT_SIZE + SLOT_PADDING) + MARGIN * 2 - SLOT_PADDING
    const height = SLOT_SIZE + MARGIN * 2

    this.bg = new Graphics()
      .roundRect(0, 0, width, height, 6)
      .fill(HUD_FILL_COLOR)
      .stroke({
        color: HUD_BORDER_COLOR,
        width: 2,
      })
    
    this.bg.alpha = 0.8
    this.addChild(this.bg)
  }

  renderSlots() {
    // Clear existing slots
    this.slots.forEach(slot => {
      this.removeChild(slot)
      slot.destroy()
    })
    this.slots = []

    // Create new slots
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = new ActionBarSlot(i, this.slotConfigs[i])
      slot.x = MARGIN + i * (SLOT_SIZE + SLOT_PADDING)
      slot.y = MARGIN
      
      slot.on('click', () => this.onSlotClick(i))
      slot.on('rightclick', () => this.onSlotRightClick(i))
      
      this.addChild(slot)
      this.slots.push(slot)
    }
  }

  onSlotClick(slotIndex) {
    // Left click - use ability or open selection menu if empty
    const config = this.slotConfigs[slotIndex]
    
    if (config.abilityId) {
      this.useAbility(slotIndex)
    } else {
      this.openAbilityMenu(slotIndex)
    }
  }

  onSlotRightClick(slotIndex) {
    // Right click - always open selection menu
    this.openAbilityMenu(slotIndex)
  }

  useAbility(slotIndex) {
    const config = this.slotConfigs[slotIndex]
    const ability = Abilities[config.abilityId]
    
    if (!ability) return
    
    // Check if ability is unlocked
    const localPlayer = playerSpriteStore.getLocalPlayer()
    const unlockedAbilities = this.getUnlockedAbilities(localPlayer?.state?.stats || {})
    
    if (!unlockedAbilities.includes(config.abilityId)) {
      console.log('Ability not unlocked:', ability.name)
      return
    }
    
    // TODO: Check cooldown, mana cost, etc.
    
    // Get cursor position for targeting
    // TODO: Get actual cursor/target position
    const targetPosition = { x: 0, y: 0 }
    
    // Filter modifiers to only include unlocked ones
    const unlockedModifiers = this.getUnlockedModifiers(localPlayer?.state?.stats || {})
    const activeModifiers = config.modifiers.filter(modId => unlockedModifiers.includes(modId))
    
    console.log(`Using ability: ${ability.name} with modifiers:`, activeModifiers)
    
    // Use the ability
    if (ability.onUse) {
      ability.onUse(localPlayer?.state, targetPosition, activeModifiers)
    }
  }

  openAbilityMenu(slotIndex) {
    this.selectedSlotIndex = slotIndex
    
    if (this.abilityMenu) {
      this.removeChild(this.abilityMenu)
      this.abilityMenu.destroy()
    }
    
    const localPlayer = playerSpriteStore.getLocalPlayer()
    const playerStats = localPlayer?.state?.stats || {}
    
    this.abilityMenu = new AbilitySelectionMenu(
      this.slotConfigs[slotIndex],
      this.getUnlockedAbilities(playerStats),
      this.getUnlockedModifiers(playerStats),
      (config) => this.onAbilitySelected(config)
    )
    
    // Position menu above action bar
    this.abilityMenu.x = 0
    this.abilityMenu.y = -this.abilityMenu.height - 10
    
    this.addChild(this.abilityMenu)
  }

  onAbilitySelected(config) {
    if (this.selectedSlotIndex !== null) {
      this.slotConfigs[this.selectedSlotIndex] = { ...config }
      this.slots[this.selectedSlotIndex].updateConfig(this.slotConfigs[this.selectedSlotIndex])
    }
    
    this.closeAbilityMenu()
  }

  closeAbilityMenu() {
    if (this.abilityMenu) {
      this.removeChild(this.abilityMenu)
      this.abilityMenu.destroy()
      this.abilityMenu = null
    }
    this.selectedSlotIndex = null
  }

  getUnlockedAbilities(playerStats) {
    const unlocked = ['BasicAttack'] // Always have basic attack
    
    // Check for abilities granted by equipment (now converted to ability-specific stats)
    Object.keys(Abilities).forEach(abilityKey => {
      if (playerStats[abilityKey] && playerStats[abilityKey] > 0) {
        unlocked.push(abilityKey)
      }
    })
    
    return unlocked
  }

  getUnlockedModifiers(playerStats) {
    const unlocked = []
    
    // Check for modifiers granted by equipment (now converted to modifier-specific stats)
    Object.keys(AbilityModifiers).forEach(modifierKey => {
      if (playerStats[modifierKey] && playerStats[modifierKey] > 0) {
        unlocked.push(modifierKey)
      }
    })
    
    return unlocked
  }

  updateUnlockedAbilities(playerStats) {
    // Update all slots to show locked/unlocked state
    this.slots.forEach((slot, index) => {
      slot.updateUnlockedState(
        this.getUnlockedAbilities(playerStats),
        this.getUnlockedModifiers(playerStats)
      )
    })
    
    // Update ability menu if open
    if (this.abilityMenu) {
      this.abilityMenu.updateUnlockedState(
        this.getUnlockedAbilities(playerStats),
        this.getUnlockedModifiers(playerStats)
      )
    }
  }

  positionAtBottom() {
    // Position at bottom center of screen
    const updatePosition = () => {
      if (this.app && this.app.screen) {
        this.x = (this.app.screen.width - this.width) / 2
        this.y = this.app.screen.height - this.height - 20
      }
    }
    
    updatePosition()
    
    // Update position when screen resizes
    this.app.renderer.on('resize', updatePosition)
  }

  onTick() {
    // Update cooldowns, etc.
    this.slots.forEach(slot => slot.onTick())
  }

  destroy() {
    if (this.unsubscribeFromPlayers) {
      this.unsubscribeFromPlayers()
    }
    
    if (this.abilityMenu) {
      this.abilityMenu.destroy()
    }
    
    super.destroy()
  }
}

export default ActionBarHud