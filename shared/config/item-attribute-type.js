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

  // ABILITIES
  FireBall: 'FireBall',
  IceBolt: 'IceBolt',
  Lightning: 'Lightning',

  // ABILITY MODIFIERS
  MultiplyProjectiles: 'MultiplyProjectiles', // modifier on an ability, shoots multiple projectiles
  HomingProjectiles: 'HomingProjectiles', // modifier on an ability, makes projectiles home in on enemies
  PiercingProjectiles: 'PiercingProjectiles', // modifier on an ability, makes projectiles pierce through enemies
  ExplodingProjectiles: 'ExplodingProjectiles', // modifier on an ability, makes projectiles explode on impact
  ChainProjectiles: 'ChainProjectiles', // modifier on an ability, makes projectiles chain between enemies
  Turret: 'Turret', // modifier on an ability, turns the ability into a turret that shoots periodically
  Pet: 'Pet', // modifier on an ability, turns the ability into a pet that fights for you

  // PASSIVE ABILITY MODIFIERS
  MaxTurrets: 'MaxTurrets', // increases the max number of turrets you can have out at a time
  MaxPets: 'MaxPets', // increases the max number of pets you can have out at a time
}

export default ItemAttributeType
