import { Container, Graphics, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities.js'
import AbilityGridItem from './ability-grid-item.js'
import ModifierListItem from './modifier-list-item.js'

const MENU_WIDTH = 400
const MENU_HEIGHT = 300
const GRID_COLS = 4
const ITEM_SIZE = 48
const ITEM_PADDING = 4
const SECTION_PADDING = 16

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
    this.renderActionButtons()
    
    this.eventMode = 'static'
    this.on('pointerdown', event => {
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }
  
  renderBackground() {
    this.bg = new Graphics()
      .roundRect(0, 0, MENU_WIDTH, MENU_HEIGHT, 8)
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
    const gridWidth = 200
    
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
      
      const item = new AbilityGridItem(ability, isUnlocked, isSelected)
      
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
    const startX = 220
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
      
      const item = new ModifierListItem(modifier, isUnlocked, isSelected)
      item.y = index * 32
      
      item.on('toggle', () => this.onModifierToggle(modifierKey))
      
      this.modifierList.addChild(item)
      this.modifierItems.push(item)
    })
  }
  
  renderActionButtons() {
    const buttonY = MENU_HEIGHT - 50
    
    // Apply button
    this.applyButton = this.createButton('Apply', 0x00aa00, () => {
      this.onSelectionChange(this.currentConfig)
    })
    this.applyButton.x = MENU_WIDTH - 120
    this.applyButton.y = buttonY
    this.addChild(this.applyButton)
    
    // Clear button
    this.clearButton = this.createButton('Clear', 0xaa0000, () => {
      this.currentConfig = { abilityId: null, modifiers: [] }
      this.updateSelections()
    })
    this.clearButton.x = MENU_WIDTH - 200
    this.clearButton.y = buttonY
    this.addChild(this.clearButton)
    
    // Cancel button
    this.cancelButton = this.createButton('Cancel', 0x666666, () => {
      this.parent?.closeAbilityMenu?.()
    })
    this.cancelButton.x = SECTION_PADDING
    this.cancelButton.y = buttonY
    this.addChild(this.cancelButton)
  }
  
  createButton(text, color, onClick) {
    const container = new Container()
    container.eventMode = 'static'
    container.cursor = 'pointer'
    
    const bg = new Graphics()
      .roundRect(0, 0, 70, 25, 4)
      .fill(color)
      .stroke({ color: 0xffffff, width: 1 })
    
    const label = new Text({
      text,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff,
        align: 'center'
      }
    })
    
    label.x = (70 - label.width) / 2
    label.y = (25 - label.height) / 2
    
    container.addChild(bg)
    container.addChild(label)
    
    container.on('pointerdown', onClick)
    
    return container
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