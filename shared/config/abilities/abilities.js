// mocking out possible abilities and what they might look like
// need helpers to get entities in range, apply damage, healing, etc

import ItemAttribute from '../item-attribute.js'
import { Sounds } from '../sounds.js'
import { Textures } from '../textures.js'
import { createProjectile, createTurret } from './ability-helpers.js'
import DamageType from './damage-type.js'

const Abilities = {
  BasicAttack: {
    id: 'BasicAttack',
    name: 'Basic Attack',
    description: 'A basic attack dealing physical damage.',
    icon: Textures.inventory.one_handed.sword, // for basic attack, this would change depending on equipped item
    cooldown: source => source.isTurret ? 500 : 250,
    color: 0xffffff,
    onUse: (source, target, modifiers) => {
      // melee attack helper here to do damage in a cone, or immediately where cursor is, etc
      // need helpers to get entities in range, apply damage, healing, etc
    },
  },

  Fireball: {
    id: 'Fireball',
    name: 'Fireball',
    description: 'A fiery projectile that explodes upon impact, dealing area fire damage.',
    icon: Textures.particle.blaze,
    sound: Sounds.abilities.Shoot,
    soundOptions: { volume: 0.6, start: 0.2, end: 0.9 },
    cooldown: source => source.isTurret ? 500 : 250,
    color: 0xcc0000,
    onUse: (source, target, modifiers) => {
      createProjectile(source, target, {
        speed: 800,
        lifetime: 2000,
        texture: Textures.particle.blaze,
        damage: 25 + (source.stats[ItemAttribute.FireDamage] || 0),
        damageType: DamageType.Fire,
        radius: 40,
        onHit: (projectile, hitEntity) => {
          // TODO: leave burning effect? tint red? don't know
        }
      })
    },
  },

  Frostbolt: {
    id: 'Frostbolt',
    name: 'Frostbolt',
    description: 'Launch a bolt of frost that slows enemies.',
    icon: Textures.particle.cold,
    cooldown: source => source.isTurret ? 500 : 250,
    color: 0x0000ee,
    onUse: (source, target, modifiers) => {
      createProjectile(source, target, {
        speed: 600,
        lifetime: 2000,
        texture: Textures.particle.cold,
        damage: 25 + (source.stats[ItemAttribute.ColdDamage] || 0),
        damageType: DamageType.Cold,
        radius: 40,
        onHit: (projectile, hitEntity) => {
          // TODO: apply slow effect? tint blue?
        }
      })
    },
  },

  Lightning: {
    id: 'Lightning',
    name: 'Lightning Bolt',
    description: 'Strike enemies at range with an instant lightning bolt.',
    icon: Textures.particle.lightning,
    cooldown: source => source.isTurret ? 500 : 250,
    color: 0xcccc00,
    onUse: (source, target, modifiers) => {
      createProjectile(source, target, {
        speed: 2000,
        lifetime: 500,
        texture: Textures.particle.lightning,
        damage: 25 + (source.stats[ItemAttribute.LightningDamage] || 0),
        damageType: DamageType.Lightning,
        radius: 40,
        onHit: (projectile, hitEntity) => {
          // TODO: apply stun effect? tint yellow?
        }
      })
    },
  },

  Heal: {
    id: 'Heal',
    name: 'Heal',
    description: 'Restore health to yourself or an ally.',
    icon: Textures.particle.heal,
    cooldown: source => source.isTurret ? 100 : 3000,
    color: 0x00cc00,
    targetAllies: true,
    onUse: (source, target, modifiers) => {

      let healAmount = 50 + (source.stats[ItemAttribute.HealingPower] || 0)
      if (source.isTurret) {
        healAmount *= 0.2 // turrets heal much faster, but only 20% of normal amount
      }

      if (target != null && typeof target.heal === 'function') {
        target.heal(healAmount)
        console.log(`${target.label} healed for ${healAmount} HP (${target.currentHealth}/${target.maxHealth} HP)`)
      } else if (source != null && typeof source.heal === 'function') {
        source.heal(healAmount)
        console.log(`${source.label} healed for ${healAmount} HP (${source.currentHealth}/${source.maxHealth} HP)`)
      }
      // todo: show heal effect animation on target?
    },
  },
}

// Helper function to use an ability with modifiers
function useAbility(abilityId, source, target, modifiers = []) {
  const ability = Abilities[abilityId]
  if (!ability) {
    console.warn(`Unknown ability: ${abilityId}`)
    return
  }

  // Check if the ability should be cast as a turret
  if (modifiers.includes('Turret')) {
    // Create a turret that will cast this ability
    createTurret(source, target, abilityId, ability, modifiers)
    return
  }

  // For other modifiers or normal casting, use the ability directly
  ability.onUse(source, target, modifiers)
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

export { Abilities, AbilityModifiers, useAbility }
