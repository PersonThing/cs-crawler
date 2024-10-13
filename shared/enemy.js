import LivingEntity from './living-entity.js'

class Enemy extends LivingEntity {
  constructor(name, pather, texture, world, color = 0xff0000) {
    super(name, pather, texture, world, color)

    this.targetEntity = null
  }

  serialize() {
    return {
      ...super.serialize(),
      targetEntity: this.targetEntityId,
    }
  }

  syncWithServer(data) {
    super.syncWithServer(data)
    this.setTargetEntity(data.targetEntityId)
  }

  onTick(deltaMs) {
    super.onTick(deltaMs)

    // todo: look for a target, attack, etc
  }
}

export default Enemy
