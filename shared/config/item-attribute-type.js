const DefensiveAttributes = {
  Health: 'Health',
  Defense: 'Defense', // reduces all damage
  PhysicalResist: 'PhysicalResistPercent',
  ColdResist: 'ColdResist',
  FireResist: 'FireResist',
  LightningResist: 'LightningResist',
  PoisonResist: 'PoisonResist',

}

const UtilityAttributes = {
  MovementSpeedPercent: 'MovementSpeedPercent',
  Vision: 'Vision',
}

const OffensiveAttributes = {
  PercentDamage: 'PercentDamage', // multiply all damage types
  PhysicalDamage: 'PhysicalDamage',
  FireDamage: 'FireDamage',
  ColdDamage: 'ColdDamage',
  LightningDamage: 'LightningDamage',
  PoisonDamage: 'PoisonDamage',

  AreaDamageRadius: 'AreaDamageRadius',
  AttackHitChance: 'AttackHitChance',
  AttackSpeedPercent: 'AttackSpeedPercent',

  ReflectDamagePercent: 'ReflectDamagePercent',
  ReflectDamageFlat: 'ReflectDamageFlat',
}

const OnHitAttributes = {
  LifePerHit: 'LifePerHit',
  Knockback: 'Knockback',
  Stun: 'Stun',

}

const AbilityAttributes = {
  MaxAbilityModifiers: 'MaxAbilityModifiers', // increases the max number of ability modifiers you can have on an ability
  ExtraProjectiles: 'ExtraProjectiles', // modifier on an ability, adds # extra projectiles to projectile abilities
  HomingProjectiles: 'HomingProjectiles', // modifier on an ability, makes projectiles home in on enemies
  PiercingProjectiles: 'PiercingProjectiles', // modifier on an ability, makes projectiles pierce through enemies
  ExplodingProjectiles: 'ExplodingProjectiles', // modifier on an ability, makes projectiles explode on impact
  ChainProjectiles: 'ChainProjectiles', // modifier on an ability, makes projectiles chain between enemies
  MaxTurrets: 'MaxTurrets', // increases the max number of turrets you can have out at a time
  MaxPets: 'MaxPets', // increases the max number of pets you can have out at a time
}

const ItemAttributeType = {
  ...DefensiveAttributes,
  ...UtilityAttributes,
  ...OffensiveAttributes,
  ...OnHitAttributes,
  ...AbilityAttributes,
}

export {
  DefensiveAttributes,
  UtilityAttributes,
  OffensiveAttributes,
  OnHitAttributes,
  AbilityAttributes
}

export default ItemAttributeType
