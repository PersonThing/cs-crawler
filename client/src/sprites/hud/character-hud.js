import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities/abilities.js'
import ItemAttributeType, {
  DefensiveAttributes,
  UtilityAttributes,
  OffensiveAttributes,
  OnHitAttributes,
  AbilityAttributes
} from '#shared/config/item-attribute-type.js'

import playerSpriteStore from '../../stores/player-sprite-store.js'

const STAT_SIZE = 12
const STAT_MARGIN = 10
const WIDTH = 500
const HEIGHT = 400
const LEFT_COLUMN_X = 20
const RIGHT_COLUMN_X = 220

// Color scheme for stat groups
const COLORS = {
  OFFENSIVE: 0xff8888,      // Red for offense
  DEFENSIVE: 0x88aaff,      // Blue for defense  
  UTILITY: 0x88ff88,        // Green for utility
  ON_HIT: 0xffaa88,         // Orange for on-hit effects
  OTHER: 0xcccccc,          // Grey for other stats
  ABILITIES: 0x88ff88,      // Green for abilities
  MODIFIERS: 0x88aaff,      // Blue for modifiers
  ABILITY_ATTRS: 0xffaa44,  // Orange for ability attributes
}

class CharacterHud extends Container {
  constructor() {
    super()

    this.content = null
    this.renderBackground()

    this.stats = {}
    this.unsubscribeFromPlayers = playerSpriteStore.subscribe(players => {
      const player = players.find(p => p.isLocalPlayer)
      this.stats = player?.state?.stats || {}
      this.renderStats()
    })

    // kill any click events that bubble through
    this.eventMode = 'static'
    this.on('pointerdown', event => {
      event.stopPropagation()
      event.preventDefault()
      return false
    })
  }

  destroy() {
    if (this.unsubscribeFromPlayers) {
      this.unsubscribeFromPlayers()
    }
  }

  isGrantedAbilityOrModifier(statName) {
    return Abilities[statName] || AbilityModifiers[statName]
  }

  renderBackground() {
    if (this.bg) {
      this.removeChild(this.bg)
      this.bg.destroy()
    }
    this.bg = new Container()
    this.addChild(this.bg)

    const gfx = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill(HUD_FILL_COLOR).stroke({
      color: HUD_BORDER_COLOR,
      width: 4,
    })
    gfx.alpha = 0.5
    gfx.x = 0
    gfx.y = 0
    this.bg.addChild(gfx)


  }

  renderStats() {
    // clear old stats
    if (this.statContainer) {
      this.removeChild(this.statContainer)
      this.statContainer.destroy()
    }
    this.statContainer = new Container()
    this.addChild(this.statContainer)

    // Separate stats into categories
    const abilities = []
    const modifiers = []
    const defensiveStats = []
    const offensiveStats = []
    const utilityStats = []
    const onHitStats = []
    const abilityAttributeStats = []
    const otherStats = []
    
    Object.keys(this.stats).forEach(statName => {
      if (Abilities[statName]) {
        abilities.push(statName)
      } else if (AbilityModifiers[statName]) {
        modifiers.push(statName)
      } else if (DefensiveAttributes[statName]) {
        defensiveStats.push(statName)
      } else if (OffensiveAttributes[statName]) {
        offensiveStats.push(statName)
      } else if (UtilityAttributes[statName]) {
        utilityStats.push(statName)
      } else if (OnHitAttributes[statName]) {
        onHitStats.push(statName)
      } else if (AbilityAttributes[statName]) {
        abilityAttributeStats.push(statName)
      } else {
        otherStats.push(statName)
      }
    })
    
    // Sort each category
    abilities.sort()
    modifiers.sort()
    defensiveStats.sort()
    offensiveStats.sort()
    utilityStats.sort()
    onHitStats.sort()
    abilityAttributeStats.sort()
    otherStats.sort()
    
    // Left column: Grouped stats
    let leftY = 20
    
    // Helper function to render a stat group
    const renderStatGroup = (stats, title, color, x, y) => {
      if (stats.length === 0) return y
      
      // Group title
      const groupTitle = new Text({
        text: title,
        style: {
          fontSize: 14,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
        x,
        y,
      })
      this.statContainer.addChild(groupTitle)
      y += 20
      
      // Group stats
      stats.forEach(statName => {
        const statValue = this.stats[statName]
        const displayText = `${statName}: ${statValue}`
        
        const statText = new Text({
          text: displayText,
          style: {
            fontSize: STAT_SIZE,
            fill: color,
          },
          x,
          y,
        })
        this.statContainer.addChild(statText)
        y += STAT_SIZE + STAT_MARGIN
      })
      
      return y + 5 // Add small spacing between groups
    }
    
    // Render stat groups in left column
    leftY = renderStatGroup(offensiveStats, 'Offense', COLORS.OFFENSIVE, LEFT_COLUMN_X, leftY)
    leftY = renderStatGroup(defensiveStats, 'Defense', COLORS.DEFENSIVE, LEFT_COLUMN_X, leftY)
    leftY = renderStatGroup(utilityStats, 'Utility', COLORS.UTILITY, LEFT_COLUMN_X, leftY)
    leftY = renderStatGroup(onHitStats, 'On Hit', COLORS.ON_HIT, LEFT_COLUMN_X, leftY)
    leftY = renderStatGroup(otherStats, 'Other', COLORS.OTHER, LEFT_COLUMN_X, leftY)
    
    // Right column: Abilities and ability-related
    let rightY = 20
    
    // Helper function for right column ability rendering
    const renderAbilityItems = (items, title, color, x, y, showCount = false) => {
      if (items.length === 0) return y
      
      // Group title
      const groupTitle = new Text({
        text: title,
        style: {
          fontSize: 14,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
        x,
        y,
      })
      this.statContainer.addChild(groupTitle)
      y += 20
      
      // Group items
      items.forEach(itemName => {
        const itemValue = this.stats[itemName]
        let displayText
        if (showCount && itemValue > 1) {
          displayText = `${itemName} (from ${itemValue} sources)`
        } else if (showCount) {
          displayText = itemName
        } else {
          displayText = `${itemName}: ${itemValue}`
        }
        
        const itemText = new Text({
          text: displayText,
          style: {
            fontSize: STAT_SIZE,
            fill: color,
          },
          x,
          y,
        })
        this.statContainer.addChild(itemText)
        y += STAT_SIZE + STAT_MARGIN
      })
      
      return y + 5 // Add small spacing between groups
    }
    
    // Render ability groups in right column
    rightY = renderAbilityItems(abilities, 'Abilities', COLORS.ABILITIES, RIGHT_COLUMN_X, rightY, true)
    rightY = renderAbilityItems(modifiers, 'Modifiers', COLORS.MODIFIERS, RIGHT_COLUMN_X, rightY, true)
    rightY = renderAbilityItems(abilityAttributeStats, 'Ability Attributes', COLORS.ABILITY_ATTRS, RIGHT_COLUMN_X, rightY, false)
  }
}

export default CharacterHud
