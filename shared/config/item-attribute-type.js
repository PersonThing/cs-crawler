const ItemAttributeType = {
  // UTILITY
  MovementSpeedPercent: 'MovementSpeedPercent',
  Vision: 'Vision',
  
  // DEFENSIVE
  Health: 'Health',
  Defense: 'Defense', // reduces all damage
  PhysicalResist: 'PhysicalResistPercent',
  ColdResist: 'ColdResist',
  FireResist: 'FireResist',
  LightningResist: 'LightningResist',
  PoisonResist: 'PoisonResist',

  // ON-HIT EFFECTS
  LifePerHit: 'LifePerHit',
  Knockback: 'Knockback',
  Stun: 'Stun',

  // OFFENSIVE
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

  // ABILITIES + ABILITY MODIFIERS
  GrantAbility: 'GrantAbility', // grants an ability (like fireball, icebolt, etc)
  GrantAbilityModifier: 'GrantAbilityModifier', // grants an ability modifier (like extra projectiles, homing, turret, pet, etc)
  MaxAbilityModifiers: 'MaxAbilityModifiers', // increases the max number of ability modifiers you can have on an ability

  // PASSIVE ABILITY MODIFIERS
  ExtraProjectiles: 'ExtraProjectiles', // modifier on an ability, adds # extra projectiles to projectile abilities
  HomingProjectiles: 'HomingProjectiles', // modifier on an ability, makes projectiles home in on enemies
  PiercingProjectiles: 'PiercingProjectiles', // modifier on an ability, makes projectiles pierce through enemies
  ExplodingProjectiles: 'ExplodingProjectiles', // modifier on an ability, makes projectiles explode on impact
  ChainProjectiles: 'ChainProjectiles', // modifier on an ability, makes projectiles chain between enemies
  MaxTurrets: 'MaxTurrets', // increases the max number of turrets you can have out at a time
  MaxPets: 'MaxPets', // increases the max number of pets you can have out at a time
}

export default ItemAttributeType
