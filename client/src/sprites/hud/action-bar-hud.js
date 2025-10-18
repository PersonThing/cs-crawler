import { Container, Graphics } from 'pixi.js'
import { HUD_FILL_COLOR } from '#shared/config/constants.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities/abilities.js'
import playerSpriteStore from '../../stores/player-sprite-store.js'
import ActionBarSlot from './action-bar-slot.js'
import AbilitySelectionMenu from './ability-selection-menu.js'
import socket from '../../socket.js'
import soundManager from '../../sound-manager.js'

const SLOT_COUNT = 6
const SLOT_SIZE = 48
const SLOT_PADDING = 2

class ActionBarHud extends Container {
  constructor(app, tooltipContainer = null) {
    super()

    this.app = app
    this.tooltipContainer = tooltipContainer
    this.slots = []
    this.selectedSlotIndex = null
    this.abilityMenu = null
    
    // Action bar configuration (loaded from player state)
    this.slotConfigs = Array(SLOT_COUNT).fill(null).map(() => ({
      abilityId: null,
      modifiers: []
    }))

    this.renderBackground()
    this.renderSlots()
    this.positionAtBottom()

    // Keep track of last known state to detect changes
    this.lastPlayerStats = null
    this.lastActionBarConfig = null

    // Listen for player changes to update unlocked abilities and load config
    this.unsubscribeFromPlayers = playerSpriteStore.subscribe(players => {
      const player = players.find(p => p.isLocalPlayer)
      const currentStats = player?.state?.stats || {}
      const currentConfig = player?.state?.actionBarConfig

      // Only update if stats actually changed
      const statsChanged = JSON.stringify(this.lastPlayerStats) !== JSON.stringify(currentStats)
      if (statsChanged) {
        this.lastPlayerStats = { ...currentStats }
        this.updateUnlockedAbilities(currentStats)
      }

      // Only reload config if it actually changed
      const configChanged = JSON.stringify(this.lastActionBarConfig) !== JSON.stringify(currentConfig)
      if (configChanged) {
        this.lastActionBarConfig = currentConfig ? [...currentConfig] : null
        this.loadPlayerActionBarConfig(player)
      }
    })

    // Kill any click events that bubble through
    this.eventMode = 'static'
    
    // Handle all pointer events to prevent player movement
    const stopEvent = (event) => {
      event.stopPropagation()
      event.preventDefault()
      return false
    }
    
    this.on('pointerdown', event => {
      // Close menu if clicking on action bar background (not on slots)
      if (this.abilityMenu && event.target === this.bg) {
        this.closeAbilityMenu()
      }
      stopEvent(event)
    })
    
    this.on('mousedown', stopEvent)
  }

  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }

    const width = SLOT_COUNT * (SLOT_SIZE + SLOT_PADDING) - SLOT_PADDING
    const height = SLOT_SIZE

    this.bg = new Graphics()
      .rect(0, 0, width, height)
      .fill(HUD_FILL_COLOR)
    
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
      const slot = new ActionBarSlot(i, this.slotConfigs[i], this.tooltipContainer)
      slot.x = i * (SLOT_SIZE + SLOT_PADDING)
      slot.y = 0
      
      slot.on('click', () => this.onSlotClick(i))
      slot.on('clear', () => this.onSlotClear(i))
      slot.on('rightclick', () => this.onSlotRightClick(i))
      
      this.addChild(slot)
      this.slots.push(slot)
    }
  }

  onSlotClick(slotIndex) {
    // Left click - always open selection menu
    this.openAbilityMenu(slotIndex)
  }

  onSlotRightClick(slotIndex) {
    // Right click - always open selection menu
    this.openAbilityMenu(slotIndex)
  }

  onSlotClear(slotIndex) {
    // Middle click - clear the slot
    this.slotConfigs[slotIndex] = { abilityId: null, modifiers: [] }
    this.slots[slotIndex].updateConfig(this.slotConfigs[slotIndex])
    this.savePlayerActionBarConfig()
  }



  useAbility(slotIndex, target = null) {
    const config = this.slotConfigs[slotIndex]
    const ability = Abilities[config.abilityId]
    
    if (!ability) return null
    
    // Check if ability is unlocked
    const localPlayer = playerSpriteStore.getLocalPlayer()
    const unlockedAbilities = this.getUnlockedAbilities(localPlayer?.state?.stats || {})
    
    if (!unlockedAbilities.includes(config.abilityId)) {
      console.log('Ability not unlocked:', ability.name)
      return null
    }
    
    // Check if ability is on cooldown
    if (localPlayer?.state?.getAbilityCooldownRemaining && 
        localPlayer.state.getAbilityCooldownRemaining(config.abilityId) > 0) {
      console.log('Ability on cooldown:', ability.name)
      return null
    }

    // Use provided target or default to origin
    const targetPosition = target || { x: 0, y: 0 }
    
    // Filter modifiers to only include unlocked ones
    const unlockedModifiers = this.getUnlockedModifiers(localPlayer?.state?.stats || {})
    const activeModifiers = config.modifiers.filter(modId => unlockedModifiers.includes(modId))
    
    console.log(`Using ability: ${ability.name} at`, targetPosition, 'with modifiers:', activeModifiers)
    
    // Emit to server to handle ability usage
    socket.emit('useAbility', {
      abilityId: config.abilityId,
      target: targetPosition,
      modifiers: activeModifiers
    })
    
    // Play ability sound effect if it has one
    let sound = ability.sound
    let soundOptions = ability.soundOptions || {}

    // if any modifiers have a sound, play their sound instead
    for (const modId of activeModifiers) {
      const modifier = AbilityModifiers[modId]
      if (modifier.sound) {
        sound = modifier.sound
        soundOptions = modifier.soundOptions || {}
        break
      }
    }
    
    // TODO: will it be possible for multiple modifiers to have sounds?
    if (sound) {
      soundManager.play(sound, soundOptions)
    }
    
    return true
  }

  // Methods to use specific slots from external code
  useSlot1(target) {
    return this.useAbility(0, target)
  }

  useSlot2(target) {
    return this.useAbility(1, target)
  }

  useSlot3(target) {
    return this.useAbility(2, target)
  }

  useSlot4(target) {
    return this.useAbility(3, target)
  }

  useSlot5(target) {
    return this.useAbility(4, target)
  }

  useSlot6(target) {
    return this.useAbility(5, target)
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
      this.savePlayerActionBarConfig() // Save configuration to player state
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
    const unlocked = [Abilities.BasicAttack.id] // Always have basic attack
    
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

  loadPlayerActionBarConfig(player) {
    if (player?.state?.actionBarConfig) {
      // Load configuration from player state
      this.slotConfigs = [...player.state.actionBarConfig]
      // If slots already exist, just update their configs to preserve unlocked state visuals
      if (this.slots.length === SLOT_COUNT) {
        this.slotConfigs.forEach((cfg, i) => {
          this.slots[i].updateConfig(cfg)
        })
      } else {
        // Initial load
        this.renderSlots()
      }
      // Re-apply unlocked state so icons don't appear locked after config-only change
      const currentStats = player.state.stats || {}
      this.updateUnlockedAbilities(currentStats)
    } else if (player?.state) {
      // Initialize default config if player has no saved config
      this.slotConfigs = Array(SLOT_COUNT).fill(null).map(() => ({
        abilityId: null,
        modifiers: []
      }))
      this.savePlayerActionBarConfig() // Save the default config
    }
  }

  savePlayerActionBarConfig() {
    const localPlayer = playerSpriteStore.getLocalPlayer()
    if (localPlayer?.state) {
      localPlayer.state.actionBarConfig = [...this.slotConfigs]
      // Send update to server to persist the change
      socket.emit('updateActionBarConfig', this.slotConfigs)
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

  tick() {
    // Update cooldowns, etc.
    const localPlayer = playerSpriteStore.getLocalPlayer()
    const playerState = localPlayer?.state
    this.slots.forEach(slot => slot.tick(playerState))
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