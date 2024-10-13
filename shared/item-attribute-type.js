const ItemAttributeType = {
  // reduces all damage
  Defense: 'Defense',

  // reduces specific damage
  PhysicalResist: 'PhysicalResist',
  ColdResist: 'ColdResist',
  FireResist: 'FireResist',
  LightningResist: 'LightningResist',
  PoisonResist: 'PoisonResist',
  
  // multiply all damage types
  PercentDamage: 'PercentDamage',

  // add specific damage
  PhysicalDamage: 'PhysicalDamage',
  FireDamage: 'FireDamage',
  ColdDamage: 'ColdDamage',
  LightningDamage: 'LightningDamage',
  PoisonDamage: 'PoisonDamage',

  AreaDamageRadius: 'AreaDamageRadius',

  AttackHitChance: 'AttackHitChance',
  AttackSpeedPercent: 'AttackSpeedPercent',
  
  MovementSpeedPercent: 'MovementSpeed',

  // glow in the dark
  Vision: 'Vision',
  
  // more later
}

export default ItemAttributeType