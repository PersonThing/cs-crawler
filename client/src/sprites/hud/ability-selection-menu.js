import { Container, Graphics, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities/abilities.js'
import AbilityGridItem from './ability-grid-item.js'
import ModifierListItem from './modifier-list-item.js'

const GRID_COLS = 4
const ITEM_SIZE = 48
const ITEM_PADDING = 4
const SECTION_PADDING = 16
const BUTTON_HEIGHT = 40
const BUTTON_WIDTH = 120
const MENU_HEIGHT = 380
const MODIFIER_WIDTH = 120
const MENU_WIDTH = SECTION_PADDING * 2 + (ITEM_SIZE + ITEM_PADDING) * GRID_COLS + MODIFIER_WIDTH + SECTION_PADDING

class AbilitySelectionMenu extends Container {
  constructor(currentConfig, unlockedAbilities, unlockedModifiers, onSelectionChange) {
    super()
    
    this.currentConfig = { ...currentConfig }
    this.unlockedAbilities = unlockedAbilities
    this.unlockedModifiers = unlockedModifiers
    this.onSelectionChange = onSelectionChange
    
    this.abilityItems = []
    this.modifierItems = []
    
    this.renderBackground()
    this.renderHeader()
    this.renderAbilityGrid()
    this.renderModifierList()
    this.renderBottomButtons()
    
    this.eventMode = 'static'
  }
  
  renderBackground() {
    this.bg = new Graphics()
      .rect(0, 0, MENU_WIDTH, MENU_HEIGHT)
      .fill(HUD_FILL_COLOR)
      .stroke({
        color: HUD_BORDER_COLOR,
        width: 3,
      })
    
    this.bg.alpha = 0.95
    this.addChild(this.bg)
  }
  
  renderHeader() {
    const title = new Text({
      text: 'Select Ability & Modifiers',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0xffffff,
      }
    })
    
    title.x = SECTION_PADDING
    title.y = SECTION_PADDING
    
    this.addChild(title)
  }
  
  renderAbilityGrid() {
    const startY = 50
    
    // Section label
    const label = new Text({
      text: 'Abilities',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xcccccc,
      }
    })
    
    label.x = SECTION_PADDING
    label.y = startY
    this.addChild(label)
    
    // Grid container
    this.abilityGrid = new Container()
    this.abilityGrid.x = SECTION_PADDING
    this.abilityGrid.y = startY + 25
    this.addChild(this.abilityGrid)
    
    // Create grid items
    const abilityKeys = Object.keys(Abilities)
    abilityKeys.forEach((abilityKey, index) => {
      const ability = Abilities[abilityKey]
      const isUnlocked = this.unlockedAbilities.includes(abilityKey)
      const isSelected = this.currentConfig.abilityId === abilityKey
      
      const item = new AbilityGridItem(ability, isUnlocked, isSelected, this)
      
      const col = index % GRID_COLS
      const row = Math.floor(index / GRID_COLS)
      
      item.x = col * (ITEM_SIZE + ITEM_PADDING)
      item.y = row * (ITEM_SIZE + ITEM_PADDING)
      
      item.on('select', () => this.onAbilitySelect(abilityKey))
      
      this.abilityGrid.addChild(item)
      this.abilityItems.push(item)
    })
  }
  
  renderModifierList() {
    const startX = GRID_COLS * (ITEM_SIZE + ITEM_PADDING) + SECTION_PADDING * 2
    const startY = 50
    
    // Section label
    const label = new Text({
      text: 'Modifiers',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xcccccc,
      }
    })
    
    label.x = startX
    label.y = startY
    this.addChild(label)
    
    // List container
    this.modifierList = new Container()
    this.modifierList.x = startX
    this.modifierList.y = startY + 25
    this.addChild(this.modifierList)
    
    // Create modifier items
    const modifierKeys = Object.keys(AbilityModifiers)
    modifierKeys.forEach((modifierKey, index) => {
      const modifier = AbilityModifiers[modifierKey]
      const isUnlocked = this.unlockedModifiers.includes(modifierKey)
      const isSelected = this.currentConfig.modifiers.includes(modifierKey)
      
  const item = new ModifierListItem(modifier, isUnlocked, isSelected, MODIFIER_WIDTH, this)
      item.y = index * 34  // Add 2px spacing between items
      
      item.on('toggle', () => this.onModifierToggle(modifierKey))
      
      this.modifierList.addChild(item)
      this.modifierItems.push(item)
    })
  }
  
  renderBottomButtons() {
    const buttonY = MENU_HEIGHT - BUTTON_HEIGHT - SECTION_PADDING
    
    // Clear button (black with light grey text)
    const clearButton = new Container()
    clearButton.eventMode = 'static'
    clearButton.cursor = 'pointer'
    
    const clearBg = new Graphics()
      .rect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT)
      .fill(0x000000)
      .stroke({ color: 0x666666, width: 2 })
    
    const clearLabel = new Text({
      text: 'Clear',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0xcccccc,
      }
    })
    
    clearLabel.x = (BUTTON_WIDTH - clearLabel.width) / 2
    clearLabel.y = (BUTTON_HEIGHT - clearLabel.height) / 2
    
    clearButton.addChild(clearBg)
    clearButton.addChild(clearLabel)
    
    clearButton.x = MENU_WIDTH - BUTTON_WIDTH - SECTION_PADDING
    clearButton.y = buttonY
    
    clearButton.on('pointerdown', () => {
      this.currentConfig = { abilityId: null, modifiers: [] }
      this.updateSelections()
      this.onSelectionChange(this.currentConfig)
    })
    
    this.addChild(clearButton)
    
    // Apply button (black with green text)
    const applyButton = new Container()
    applyButton.eventMode = 'static'
    applyButton.cursor = 'pointer'
    
    const applyBg = new Graphics()
      .rect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT)
      .fill(0x000000)
      .stroke({ color: 0x00aa00, width: 2 })
    
    const applyLabel = new Text({
      text: 'Apply',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0x00ff00,
      }
    })
    
    applyLabel.x = (BUTTON_WIDTH - applyLabel.width) / 2
    applyLabel.y = (BUTTON_HEIGHT - applyLabel.height) / 2
    
    applyButton.addChild(applyBg)
    applyButton.addChild(applyLabel)
    
    applyButton.x = SECTION_PADDING
    applyButton.y = buttonY
    
    applyButton.on('pointerdown', () => {
      this.onSelectionChange(this.currentConfig)
    })
    
    this.addChild(applyButton)
  }

  onAbilitySelect(abilityKey) {
    this.currentConfig.abilityId = abilityKey
    this.updateSelections()
  }
  
  onModifierToggle(modifierKey) {
    const currentIndex = this.currentConfig.modifiers.indexOf(modifierKey)
    
    if (currentIndex === -1) {
      // Add modifier (limit to 2)
      if (this.currentConfig.modifiers.length < 2) {
        this.currentConfig.modifiers.push(modifierKey)
      }
    } else {
      // Remove modifier
      this.currentConfig.modifiers.splice(currentIndex, 1)
    }
    
    this.updateSelections()
  }
  
  updateSelections() {
    // Update ability selections
    this.abilityItems.forEach((item, index) => {
      const abilityKey = Object.keys(Abilities)[index]
      item.setSelected(this.currentConfig.abilityId === abilityKey)
    })
    
    // Update modifier selections
    this.modifierItems.forEach((item, index) => {
      const modifierKey = Object.keys(AbilityModifiers)[index]
      item.setSelected(this.currentConfig.modifiers.includes(modifierKey))
    })
  }
  
  updateUnlockedState(unlockedAbilities, unlockedModifiers) {
    this.unlockedAbilities = unlockedAbilities
    this.unlockedModifiers = unlockedModifiers
    
    // Update ability items
    this.abilityItems.forEach((item, index) => {
      const abilityKey = Object.keys(Abilities)[index]
      item.setUnlocked(this.unlockedAbilities.includes(abilityKey))
    })
    
    // Update modifier items
    this.modifierItems.forEach((item, index) => {
      const modifierKey = Object.keys(AbilityModifiers)[index]
      item.setUnlocked(this.unlockedModifiers.includes(modifierKey))
    })
  }
}

export default AbilitySelectionMenu