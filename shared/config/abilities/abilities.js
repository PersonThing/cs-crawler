// mocking out possible abilities and what they might look like
// need helpers to get entities in range, apply damage, healing, etc

import ItemAttributeType from '../item-attribute-type.js'
import { Sounds } from '../sounds.js'
import { Textures } from '../textures.js'
import { createProjectile } from './ability-helpers.js'
import DamageType from './damage-type.js'

const Abilities = {
  BasicAttack: {
    id: 'BasicAttack',
    name: 'Basic Attack',
    description: 'A basic attack dealing physical damage.',
    icon: Textures.inventory.one_handed.sword, // for basic attack, this would change depending on equipped item
    cooldown: 250,
    onUse: (source, target, modifiers) => {
      // melee attack helper here to do damage in a cone, or immediately where cursor is, etc
      // need helpers to get entities in range, apply damage, healing, etc
      return true // Allow player to move to target
    },
  },

  Fireball: {
    id: 'Fireball',
    name: 'Fireball',
    description: 'A fiery projectile that explodes upon impact, dealing area fire damage.',
    icon: Textures.particle.blaze,
    sound: Sounds.abilities.Shoot,
    soundOptions: { volume: 0.6, start: 0.2, end: 0.9 },
    cooldown: 250,
    onUse: (source, target, modifiers) => {
      createProjectile(source, target, {
        speed: 800,
        lifetime: 2000,
        texture: Textures.particle.blaze,
        damage: 25 + (source.stats[ItemAttributeType.FireDamage] || 0),
        damageType: DamageType.Fire,
        radius: 40
      })
    },
  },

  Frostbolt: {
    id: 'Frostbolt',
    name: 'Frostbolt',
    description: 'Launch a bolt of frost that slows enemies.',
    icon: Textures.particle.cold, // Using sapphire gem as frost icon placeholder
    cooldown: 250,
    onUse: (source, target, modifiers) => {
      // frost projectile attack helper - projectile that slows on hit
      createProjectile(source, target, {
        speed: 600,
        lifetime: 2000,
        texture: Textures.particle.cold,
        damage: 25 + (source.stats[ItemAttributeType.ColdDamage] || 0),
        damageType: DamageType.Cold,
        radius: 40,
        onHit: (projectile, hitEntity) => {
          // TODO: apply slow effect to hitEntity that lasts 2 seconds ?
        }
      })
    },
  },

  Lightning: {
    id: 'Lightning',
    name: 'Lightning Bolt',
    description: 'Strike enemies at range with an instant lightning bolt.',
    icon: Textures.inventory.item.gems.topaz, // Using topaz gem as lightning icon placeholder
    cooldown: 500,
    onUse: (source, target, modifiers) => {
      createProjectile(source, target, {
        speed: 2000,
        lifetime: 2000,
        texture: Textures.particle.lightning,
        damage: 25 + (source.stats[ItemAttributeType.LightningDamage] || 0),
        damageType: DamageType.Lightning,
        radius: 40,
        onHit: (projectile, hitEntity) => {
          // TODO: apply slow effect to hitEntity that lasts 2 seconds ?
        }
      })
    },
  },

  Heal: {
    id: 'Heal',
    name: 'Heal',
    description: 'Restore health to yourself or an ally.',
    icon: Textures.inventory.item.gems.emerald, // Using emerald gem as heal icon placeholder
    cooldown: 5000,
    onUse: (source, target, modifiers) => {
      // Heal the source player for 50 HP
      source.heal(50)
      console.log(`${source.label} healed for 50 HP (${source.currentHealth}/${source.maxHealth} HP)`)
      return false // No movement required for heal
    },
  },
}

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
    sound: Sounds.abilities.Turret,
    soundOptions: { volume: 0.5, start: 0.2, end: 0.6 },
  },

  Pet: {
    id: 'Pet',
    name: 'Pet',
    description: 'Summon a pet that follows you and uses this ability for you.',
    sound: Sounds.abilities.Pet,
    soundOptions: { volume: 0.5, start: 0.2, end: 0.7 },
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

export { Abilities, AbilityModifiers }
