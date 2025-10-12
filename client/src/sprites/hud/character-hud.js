import { Graphics, Container, Text } from 'pixi.js'
import { HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'
import { Abilities, AbilityModifiers } from '#shared/config/abilities.js'

import playerSpriteStore from '../../stores/player-sprite-store.js'

const STAT_SIZE = 12
const STAT_MARGIN = 10
const WIDTH = 300
const HEIGHT = 500

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

    // stats text
    const title = new Text({
      text: 'Stats',
      style: {
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
      x: 10,
      y: 10,
    })
    this.bg.addChild(title)
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
    const abilityRelatedStats = []
    const regularStats = []
    
    Object.keys(this.stats).forEach(statName => {
      if (Abilities[statName]) {
        abilities.push(statName)
      } else if (AbilityModifiers[statName]) {
        modifiers.push(statName)
      } else if (statName === 'MaxAbilityModifiers') {
        abilityRelatedStats.push(statName)
      } else {
        regularStats.push(statName)
      }
    })
    
    // Sort each category
    abilities.sort()
    modifiers.sort()
    abilityRelatedStats.sort()
    regularStats.sort()
    
    let currentY = 50
    let index = 0
    
    // Render abilities first
    abilities.forEach(statName => {
      const statValue = this.stats[statName]
      let displayText
      if (statValue > 1) {
        displayText = `Ability: ${statName} (by ${statValue} items)`
      } else {
        displayText = `Ability: ${statName}`
      }
      
      const statText = new Text({
        text: displayText,
        style: {
          fontSize: STAT_SIZE,
          fill: 0x88ff88, // Light green for abilities
        },
        x: 20,
        y: currentY,
      })
      this.statContainer.addChild(statText)
      currentY += STAT_SIZE + STAT_MARGIN
      index++
    })
    
    // Render modifiers second
    modifiers.forEach(statName => {
      const statValue = this.stats[statName]
      let displayText
      if (statValue > 1) {
        displayText = `Ability Modifier: ${statName} (by ${statValue} items)`
      } else {
        displayText = `Ability Modifier: ${statName}`
      }
      
      const statText = new Text({
        text: displayText,
        style: {
          fontSize: STAT_SIZE,
          fill: 0x88aaff, // Light blue for modifiers
        },
        x: 20,
        y: currentY,
      })
      this.statContainer.addChild(statText)
      currentY += STAT_SIZE + STAT_MARGIN
      index++
    })
    
    // Render ability-related stats third
    abilityRelatedStats.forEach(statName => {
      const statValue = this.stats[statName]
      const displayText = `${statName}: ${statValue}`
      
      const statText = new Text({
        text: displayText,
        style: {
          fontSize: STAT_SIZE,
          fill: 0xffaa44, // Orange for ability-related stats
        },
        x: 20,
        y: currentY,
      })
      this.statContainer.addChild(statText)
      currentY += STAT_SIZE + STAT_MARGIN
      index++
    })
    
    // Add spacing between abilities/modifiers/ability-related and regular stats
    if ((abilities.length > 0 || modifiers.length > 0 || abilityRelatedStats.length > 0) && regularStats.length > 0) {
      currentY += STAT_MARGIN
    }
    
    // Render regular stats last
    regularStats.forEach(statName => {
      const statValue = this.stats[statName]
      const displayText = `${statName}: ${statValue}`
      
      const statText = new Text({
        text: displayText,
        style: {
          fontSize: STAT_SIZE,
          fill: 0xffffff, // White for regular stats
        },
        x: 20,
        y: currentY,
      })
      this.statContainer.addChild(statText)
      currentY += STAT_SIZE + STAT_MARGIN
      index++
    })
  }
}

export default CharacterHud
