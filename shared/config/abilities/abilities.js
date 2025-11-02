// TODO: need to work on logic here for pets who drop turrets

import ItemAttribute from '../item-attribute.js'
import { Sounds } from '../sounds.js'
import { Textures } from '../textures.js'
import { createProjectiles } from './projectiles.js'
import { createTurret } from './turrets.js'
import { createPet } from './pets.js'
import { applyAreaDamage } from '../../utils/damage-helper.js'

import DamageType from './damage-type.js'

// Helper function to apply attack speed to cooldowns
function applyCooldownReduction(baseCooldown, source) {
  const attackSpeedPercent = (source.stats && source.stats[ItemAttribute.AttackSpeedPercent]) || 0
  // Attack speed reduces cooldown: 100% attack speed = 2x attack rate = 0.5x cooldown
  const cooldownMultiplier = 1 / (1 + attackSpeedPercent / 100)
  return Math.max(50, Math.round(baseCooldown * cooldownMultiplier)) // Minimum 50ms cooldown
}

const Abilities = {
  BasicAttack: {
    id: 'BasicAttack',
    name: 'Basic Attack',
    description: 'A basic attack dealing physical damage.',
    icon: Textures.inventory.one_handed.sword, // for basic attack, this would change depending on equipped item
    cooldown: source => applyCooldownReduction(source.isTurret || source.isPet ? 500 : 250, source),
    range: 100, // Melee range in pixels
    color: 0xffffff,
    onUse: (source, target, modifiers, enemies = []) => {
      // Apply cone damage in front of the source
      const damage = 20 + (source.stats[ItemAttribute.PhysicalDamage] || 0)
      const result = applyAreaDamage(source, target, enemies, damage, 'cone', {
        range: 100, // 100 pixel range
        angle: (Math.PI / 3) * 2, // 120 degree cone
        damageType: DamageType.Physical,
      })

      return result.effectData // Return effect data for client visualization
    },
  },

  Fireball: {
    id: 'Fireball',
    name: 'Fireball',
    description: 'A fiery projectile that explodes upon impact, dealing area fire damage.',
    icon: Textures.particle.blaze,
    sound: Sounds.abilities.Shoot,
    soundOptions: { volume: 0.6, start: 0.2, end: 0.9 },
    cooldown: source => applyCooldownReduction(source.isTurret || source.isPet ? 500 : 250, source),
    range: 800, // Projectile range in pixels
    color: 0xcc0000,
    onUse: (source, target, limitedModifiers, enemies = []) => {
      const damage = 25 + (source.stats[ItemAttribute.FireDamage] || 0)
      createProjectiles(source, target, {
        speed: 800,
        lifetime: 2000,
        texture: Textures.particle.blaze,
        damage: 0, // projectile does 0 damage itself, just triggers an explosion that does area damage instead
        damageType: DamageType.Fire,
        radius: 40,
        onHit: (projectile, hitEntity, enemies) => {
          // Create an explosion at the projectile's location
          const result = applyAreaDamage(projectile, projectile, enemies, damage, 'radius', {
            radius: 150,
            damageType: DamageType.Fire,
          })
          return result.effectData // Return effect data for visualization
        },
      }, limitedModifiers)
    },
  },

  Frostbolt: {
    id: 'Frostbolt',
    name: 'Frostbolt',
    description: 'Launch a bolt of frost that slows enemies.',
    icon: Textures.particle.cold,
    cooldown: source => (source.isTurret || source.isPet ? 500 : 250),
    range: 600, // Projectile range in pixels
    color: 0x0000ee,
    onUse: (source, target, modifiers, enemies = []) => {
      const damage = 25 + (source.stats[ItemAttribute.ColdDamage] || 0)
      createProjectiles(source, target, {
        speed: 600,
        lifetime: 2000,
        texture: Textures.particle.cold,
        damage: 0,
        damageType: DamageType.Cold,
        radius: 40,
        onHit: (projectile, hitEntity, enemies) => {
          // Create an explosion at the projectile's location
          const result = applyAreaDamage(projectile, projectile, enemies, damage, 'radius', {
            radius: 50,
            damageType: DamageType.Cold,
          })
          return result.effectData // Return effect data for visualization
        },
      }, modifiers)
    },
  },

  Lightning: {
    id: 'Lightning',
    name: 'Lightning Bolt',
    description: 'Strike enemies at range with an instant lightning bolt.',
    icon: Textures.particle.lightning,
    cooldown: source => applyCooldownReduction(source.isTurret || source.isPet ? 500 : 250, source),
    range: 400, // Lightning range in pixels
    color: 0xcccc00,
    onUse: (source, target, modifiers, enemies = []) => {
      // Apply line damage in front of the source
      const damage = 20 + (source.stats[ItemAttribute.LightningDamage] || 0)
      const result = applyAreaDamage(source, target, enemies, damage, 'line', {
        range: 400,
        width: 30,
        damageType: DamageType.Lightning,
        onHit: (projectile, hitEntity, enemies) => {
          // TODO: apply stun effect? tint yellow?
        },
      })

      return result.effectData // Return effect data for client visualization
    },
  },

  Heal: {
    id: 'Heal',
    name: 'Heal',
    description: 'Restore health to yourself or an ally.',
    icon: Textures.particle.heal,
    cooldown: (source, modifiers) => {
      const baseCooldown =
        source.isTurret || source.isPet
          ? 250 // turrets and pets cast faster
          : modifiers.includes(AbilityModifiers.Turret.id) || modifiers.includes(AbilityModifiers.Pet.id)
            ? 250 // this ability will be placing a turret or pet, so let them cast it quickly, no need for big cd
            : 3000
      return applyCooldownReduction(baseCooldown, source)
    },
    range: 200, // Heal range in pixels
    color: 0x00cc00,
    targetAllies: true,
    onUse: (source, target, modifiers, enemies = []) => {
      let healAmount = 50 + (source.stats[ItemAttribute.HealingPower] || 0)
      if (source.isTurret) {
        healAmount *= 0.2 // turrets heal much faster, but only 20% of normal amount
      }

      if (target != null && typeof target.heal === 'function') {
        target.heal(healAmount)
        // console.log(`${target.label} healed for ${healAmount} HP (${target.currentHealth}/${target.maxHealth} HP)`)
      } else if (source != null && typeof source.heal === 'function') {
        source.heal(healAmount)
        // console.log(`${source.label} healed for ${healAmount} HP (${source.currentHealth}/${source.maxHealth} HP)`)
      }
      // todo: show heal effect animation on target?
    },
  },
}

// Helper function to use an ability with modifiers
function useAbility(abilityId, source, target, modifiers = [], enemies = []) {
  const ability = Abilities[abilityId]
  if (!ability) {
    console.warn(`Unknown ability: ${abilityId}`)
    return
  }

  // Limit modifiers based on MaxAbilityModifiers stat (1 + bonus)
  const maxModifiers = 1 + ((source.stats && source.stats[ItemAttribute.MaxAbilityModifiers]) || 0)
  const limitedModifiers = modifiers.slice(0, maxModifiers)

  // Check if the ability should be cast as a pet
  if (limitedModifiers.includes(AbilityModifiers.Pet.id)) {
    // Create a pet that will cast this ability
    createPet(source, target, abilityId, ability, limitedModifiers)
    return
  }

  // Check if the ability should be cast as a turret
  if (limitedModifiers.includes(AbilityModifiers.Turret.id)) {
    // Create a turret that will cast this ability
    createTurret(source, target, abilityId, ability, limitedModifiers)
    return
  }

  // For other modifiers or normal casting, use the ability directly
  const effectData = ability.onUse(source, target, limitedModifiers, enemies)
  return effectData
}

// Ability Modifiers
// when assigning an ability to an action bar, you will be able to assign modifiers to the ability (for now, just allow assigning up to 1 modifier)
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
  HomingProjectiles: {
    id: 'HomingProjectiles',
    name: 'HomingProjectiles',
    description: 'Makes projectiles home in on enemies.',
  },
  PiercingProjectiles: {
    id: 'PiercingProjectiles',
    name: 'PiercingProjectiles',
    description: 'Makes projectiles pierce through enemies.',
  },
}

export { Abilities, AbilityModifiers, useAbility }
