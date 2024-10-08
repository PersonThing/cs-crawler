import * as PIXI from 'pixi.js'
import { Textures } from './textures.js'
import LivingEntity from './living-entity.js'

class Player extends LivingEntity {
  constructor(socketId, name, pather, texture, world, color) {
    super(name, pather, texture, world, color)

    this.socketId = socketId

    // TODO: remove this - hacking some textures in quick to test graphics
    this.weaponTextures = Object.values(Textures.weapons)
    this.setWeapon(0)
    this.armorTextures = Object.values(Textures.armors)
    this.setArmor(0)
  }

  setLabel(label) {
    if (this.label == 'You') return

    super.setLabel(label)
  }

  setArmor(ix) {
    if (ix == null || ix < 0 || ix > this.armorTextures.length - 1) {
      ix = 0
    }
    this.tempArmorIndex = ix

    if (this.entitySprite) {
      if (this.tempArmorSprite) {
        this.tempArmorSprite.parent.removeChild(this.tempArmorSprite)
        this.tempArmorSprite.destroy()
      }
      this.tempArmorSprite = PIXI.Sprite.from(this.armorTextures[ix])
      this.tempArmorSprite.anchor.set(0.5)
      this.entitySprite.addChild(this.tempArmorSprite)
    }
  }

  setWeapon(ix) {
    if (ix == null || ix < 0 || ix > this.weaponTextures.length - 1) {
      ix = 0
    }
    this.tempWeaponIndex = ix

    if (this.entitySprite) {
      if (this.tempWeaponSprite) {
        this.tempWeaponSprite.parent.removeChild(this.tempWeaponSprite)
        this.tempWeaponSprite.destroy()
      }
      this.tempWeaponSprite = PIXI.Sprite.from(this.weaponTextures[ix])
      this.tempWeaponSprite.anchor.set(0.5)
      this.entitySprite.addChild(this.tempWeaponSprite)
    }
  }

  selectNextArmor() {
    this.tempArmorIndex += 1
    if (this.tempArmorIndex > this.armorTextures.length - 1) {
      this.tempArmorIndex = 0
    }
    this.setArmor(this.tempArmorIndex)
  }

  selectPreviousArmor() {
    this.tempArmorIndex -= 1
    if (this.tempArmorIndex < 0) {
      this.tempArmorIndex = this.armorTextures.length - 1
    }
    this.setArmor(this.tempArmorIndex)
  }

  selectNextWeapon() {
    this.tempWeaponIndex += 1
    if (this.tempWeaponIndex > this.weaponTextures.length - 1) {
      this.tempWeaponIndex = 0
    }
    this.setWeapon(this.tempWeaponIndex)
  }

  selectPreviousWeapon() {
    this.tempWeaponIndex -= 1
    if (this.tempWeaponIndex < 0) {
      this.tempWeaponIndex = this.weaponTextures.length - 1
    }
    this.setWeapon(this.tempWeaponIndex)
  }

  getSyncProperties() {
    return {
      ...super.getSyncProperties(),
      socketId: this.socketId,
      tempWeaponIndex: this.tempWeaponIndex,
      tempArmorIndex: this.tempArmorIndex,
    }
  }

  syncWithServer(data) {
    super.syncWithServer(data)
    this.setWeapon(data.tempWeaponIndex)
    this.setArmor(data.tempArmorIndex)
  }
}

export default Player
