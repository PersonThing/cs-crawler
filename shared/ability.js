// mocking out possible abilities and what they might look like

const DamageType = {
  Physical: 'Physical',
  Fire: 'Fire',
  Cold: 'Cold',
  Lightning: 'Lightning',
  Poison: 'Poison',
}

const Ability = {
  BasicAttack: {
    cooldown: (stats) => {
      // max 4 attacks per second
      return Math.max(1000 - (stats.attackSpeed * 1000), 250)
    },
    damage: (stats) => {
      // stats will be an object with the sum of the character's current attributes
      return stats.damage
    },
    damageType: DamageType.Physical,
    range: (stats) => {
      return stats.range
    },
  },

  Fireball: {
    cooldown: (stats) => {
      // max 2 attacks per second
      return Math.max(1000 - (stats.attackSpeed * 1000), 500)
    },
    damage: (stats) => {
      return 50 * this.level * (1 + stats.damage/100)
    },
    damageType: DamageType.Fire,
    range: 700,
    projectile: true,
    projectileSpeed: 500,
    projectileTexture: Textures.particle.blaze,
  },

  Iceball: {
    cooldown: (stats) => {
      // max 2 attacks per second
      return Math.max(1000 - (stats.attackSpeed * 1000), 500)
    },
    damage: (stats) => {
      return 50 * this.level * (1 + stats.damage/100)
    },
    damageType: DamageType.Cold,
    range: 700,
    projectile: true,
    projectileSpeed: 500,
    projectileTexture: Textures.particle.cold,
  },

  LightningBolt: {
    cooldown: (stats) => {
      // max 2 attacks per second
      return Math.max(1000 - (stats.attackSpeed * 1000), 500)
    },
    damage: (stats) => {
      return 50 * this.level * (1 + stats.damage/100)
    },
    damageType: DamageType.Lightning,
    range: 700,
    projectile: true,
    projectileSpeed: 2000,
    projectileTexture: Textures.particle.lightning,
  },

  PoisonDart: {
    cooldown: (stats) => {
      // max 2 attacks per second
      return Math.max(1000 - (stats.attackSpeed * 1000), 500)
    },
    damage: (stats) => {
      return 50 * this.level * (1 + stats.damage/100)
    },
    damageType: DamageType.Poison,
    range: 700,
    projectile: true,
    projectileSpeed: 500,
    projectileTexture: Textures.particle.poison,
  },

  Turret: {},
}
