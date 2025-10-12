// mocking out possible abilities and what they might look like
// need helpers to get entities in range, apply damage, healing, etc

import { Textures } from './textures.js'
import ItemAttributeType from './item-attribute-type.js'

const DamageType = {
  Physical: 'Physical',
  Fire: 'Fire',
  Cold: 'Cold',
  Lightning: 'Lightning',
  Poison: 'Poison',
}

export default class Ability {
  /**
   *
   * @param {String} name
   * @param {String} description
   * @param {Texture} icon
   */
  constructor(name, description, icon) {
    this.name = name
    this.description = description
    this.icon = icon
  }
}

const Abilities = {
  BasicAttack: {
    id: 'BasicAttack',
    name: 'Basic Attack',
    description: 'A basic attack dealing physical damage.',
    icon: Textures.inventory.one_handed.sword, // for basic attack, this would change depending on equipped item
    cooldown: 250,
    onUse: (source, targetPosition, modifiers) => {
      // melee attack helper here to do damage in a cone, or immediately where cursor is, etc
      // need helpers to get entities in range, apply damage, healing, etc
      console.log('basic attack used by', source, 'at', targetPosition, 'with modifiers', modifiers)
    },
  },

  Fireball: {
    id: 'Fireball',
    name: 'Fireball',
    description: 'A fiery projectile that explodes upon impact, dealing area fire damage.',
    icon: Textures.particle.blaze,
    cooldown: 1000,
    onUse: (source, targetPosition, modifiers) => {
      // projectile attack helper here to fire a projectile that then has its own tick handling
      console.log('fireball used by', source, 'at', targetPosition, 'with modifiers', modifiers)
    },
  },
}

export { Ability, Abilities, AbilityModifiers, DamageType }

// Ability Modifiers
// when assigning an ability to an action bar, you will be able to assign modifiers to the ability (for now, just allow assigning up to 2 modifiers)
// these modifiers will change how the ability is used, e.g. cast on cooldown, cast on hit, summon a turret to use the ability, etc
// when an ability is used, it will be passed the list of modifiers to determine how to handle the ability use
// e.g. if the ability has the Turret modifier, it will summon a turret that uses the ability instead of the player using it directly
const AbilityModifiers = {
  Turret: {
    id: 'Turret',
    name: 'Turret',
    description: 'Summon a turret that uses this ability for you.',
  },

  Pet: {
    id: 'Pet',
    name: 'Pet',
    description: 'Summon a pet that follows you and uses this ability for you.',
  },

  CastOnEnemyHit: {
    id: 'CastOnEnemyHit',
    name: 'CastOnEnemyHit',
    description: 'Cast this ability automatically when you hit an enemy.',
  },

  CastOnSelfHit: {
    id: 'CastOnSelfHit',
    name: 'CastOnSelfHit',
    description: 'Cast this ability automatically when you are hit by an enemy.',
  },

  CastOnCooldown: {
    id: 'CastOnCooldown',
    name: 'CastOnCooldown',
    description: 'Cast this ability automatically on cooldown.',
  },

  CastOnLowHealth: {
    id: 'CastOnLowHealth',
    name: 'CastOnLowHealth',
    description: 'Cast this ability automatically when your health is low.',
  },
}
