class SoundManager {
  constructor() {
    this.sounds = {}
    this.volume = 0.5
    this.enabled = true
  }

  async loadSound(name, path) {
    try {
      const audio = new Audio(path)
      audio.preload = 'auto'
      audio.volume = this.volume
      this.sounds[name] = audio
      return audio
    } catch (error) {
      console.warn(`Failed to load sound: ${name}`, error)
      return null
    }
  }

  play(name, options = {}) {
    const { volume = this.volume, startTime = 0, endTime = null, duration = null } = options
    if (!this.enabled || !this.sounds[name]) {
      return
    }

    try {
      const audio = this.sounds[name].cloneNode()
      audio.volume = volume
      
      // Set start time
      if (startTime > 0) {
        audio.currentTime = startTime
      }
      
      // Set up end time or duration handling
      let stopTimer = null
      if (endTime !== null) {
        const playDuration = (endTime - startTime) * 1000 // convert to milliseconds
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
        console.warn(`Failed to play sound: ${name}`, error)
        if (stopTimer) {
          clearTimeout(stopTimer)
        }
      })
      
      return audio // Return audio element in case caller needs to control it
    } catch (error) {
      console.warn(`Failed to play sound: ${name}`, error)
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
    await Promise.all([
      this.loadSound('item-pickup', 'assets/sounds/item-pickup.m4a'),
      this.loadSound('item-equip', 'assets/sounds/item-equip.m4a'),
      this.loadSound('item-drop', 'assets/sounds/item-drop.m4a'),
      // Add more sounds here as needed
    ])
  }
}

const soundManager = new SoundManager()
export default soundManager