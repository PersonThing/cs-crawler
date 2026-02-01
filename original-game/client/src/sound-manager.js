import { Sounds } from '#shared/config/sounds.js'

class SoundManager {
  constructor() {
    this.sounds = {} // Maps file paths to loaded audio elements
    this.volume = 0.5
    this.enabled = true
  }

  // Helper function to flatten nested sound tree and collect all paths
  _flattenSounds(obj, result = []) {
    for (const value of Object.values(obj)) {
      if (typeof value === 'string') {
        result.push(value)
      } else if (typeof value === 'object') {
        this._flattenSounds(value, result)
      }
    }
    return result
  }

  async loadSound(path) {
    try {
      const audio = new Audio(path)
      audio.preload = 'auto'
      audio.volume = this.volume
      this.sounds[path] = audio
      return audio
    } catch (error) {
      console.warn(`Failed to load sound: ${path}`, error)
      return null
    }
  }

  play(soundPath, options = {}) {
    const { volume = this.volume, start = 0, end = null, duration = null } = options
    if (!this.enabled || !this.sounds[soundPath]) {
      console.warn(`Sound not found or not loaded: ${soundPath}`)
      return
    }

    try {
      const audio = this.sounds[soundPath].cloneNode()
      audio.volume = volume

      // Set start time
      if (start > 0) {
        audio.currentTime = start
      }

      // Set up end time or duration handling
      let stopTimer = null
      if (end !== null) {
        const playDuration = (end - start) * 1000 // convert to milliseconds
        stopTimer = setTimeout(() => {
          audio.pause()
          audio.currentTime = 0
        }, playDuration)
      } else if (duration !== null) {
        stopTimer = setTimeout(() => {
          audio.pause()
          audio.currentTime = 0
        }, duration * 1000) // convert to milliseconds
      }

      // Clean up timer when audio ends naturally
      audio.addEventListener('ended', () => {
        if (stopTimer) {
          clearTimeout(stopTimer)
        }
      })

      audio.play().catch(error => {
        console.warn(`Failed to play sound: ${soundPath}`, error)
        if (stopTimer) {
          clearTimeout(stopTimer)
        }
      })

      return audio // Return audio element in case caller needs to control it
    } catch (error) {
      console.warn(`Failed to play sound: ${soundPath}`, error)
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    Object.values(this.sounds).forEach(audio => {
      audio.volume = this.volume
    })
  }

  setEnabled(enabled) {
    this.enabled = enabled
  }

  async preloadSounds() {
    const soundPaths = this._flattenSounds(Sounds)
    const soundPromises = soundPaths.map(path => this.loadSound(path))
    await Promise.all(soundPromises)
    console.log(`Preloaded ${soundPaths.length} sounds`)
  }
}

const soundManager = new SoundManager()
export default soundManager
