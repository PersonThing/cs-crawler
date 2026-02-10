import EntitySprite from './entity-sprite.js'
import soundManager from '../sound-manager.js'
import { Sounds } from '#shared/config/sounds.js'

class PlayerSprite extends EntitySprite {
  constructor(playerState, texture, world, pather, color) {
    super(playerState, texture, world, pather, color)

    this.isMoving = false
    this.stepSound = null
    this.lastPosition = { x: this.state.x, y: this.state.y }
  }

  updateFromState() {
    super.updateFromState()

    // Only handle step sounds for local player
    if (this.isLocalPlayer) {
      this.updateStepSound()
    }
  }

  updateStepSound() {
    // Check if player is moving by comparing current position to last position
    const currentlyMoving = Math.abs(this.state.x - this.lastPosition.x) > 0.1 || Math.abs(this.state.y - this.lastPosition.y) > 0.1

    // Update last position
    this.lastPosition.x = this.state.x
    this.lastPosition.y = this.state.y

    // Handle step sound based on movement state
    if (currentlyMoving && !this.isMoving) {
      // Started moving - play step sound on loop
      this.isMoving = true
      this.stepSound = soundManager.play(Sounds.Stepping, { volume: 0.6 })
      if (this.stepSound) {
        this.stepSound.loop = true
        // this.stepSound.playbackRate = 2.5
      }
    } else if (!currentlyMoving && this.isMoving) {
      // Stopped moving - stop step sound
      this.isMoving = false
      if (this.stepSound) {
        this.stepSound.pause()
        this.stepSound.currentTime = 0
        this.stepSound = null
      }
    }
  }

  destroy() {
    // Clean up step sound when sprite is destroyed
    if (this.stepSound) {
      this.stepSound.pause()
      this.stepSound.currentTime = 0
      this.stepSound = null
    }
    super.destroy()
  }
}

export default PlayerSprite
