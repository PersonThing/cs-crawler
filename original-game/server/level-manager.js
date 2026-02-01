import Pather from '#shared/pather.js'

class LevelGenerationManager {
  constructor() {
    this.level = null
    this.pather = null

    // Level generation state management
    this.levelGenerationInProgress = false
    this.levelGenerationRequestedBy = null
    this.levelGenerationTimeout = null
    this.LEVEL_GENERATION_TIMEOUT_MS = 10000 // 10 seconds
    this.pendingPlayerInitializations = [] // Players waiting for level generation
  }

  hasLevel() {
    return this.level != null
  }

  getLevel() {
    return this.level
  }

  getPather() {
    return this.pather
  }

  requestLevelGeneration(playerId, socket, initCallback) {
    // Add this player to the pending list
    this.pendingPlayerInitializations.push({ playerId, socket, initCallback })

    // If generation is already in progress, just wait
    if (this.levelGenerationInProgress) {
      console.log(`Player ${playerId} waiting for level generation in progress by ${this.levelGenerationRequestedBy}`)
      return
    }

    // Start level generation process
    this.levelGenerationInProgress = true
    this.levelGenerationRequestedBy = playerId
    console.log(`Requesting level generation from player ${playerId}`)

    // Set timeout to try next player if this one fails
    this.levelGenerationTimeout = setTimeout(() => {
      console.log(`Level generation timeout for player ${this.levelGenerationRequestedBy}, trying next player`)
      this.levelGenerationInProgress = false
      this.levelGenerationRequestedBy = null

      // Remove the failed player from pending list and try the next one
      this.pendingPlayerInitializations = this.pendingPlayerInitializations.filter(p => p.playerId !== playerId)
      this.tryNextLevelGeneration()
    }, this.LEVEL_GENERATION_TIMEOUT_MS)

    socket.emit('requestLevel')
  }

  tryNextLevelGeneration() {
    if (this.level != null || this.levelGenerationInProgress || this.pendingPlayerInitializations.length === 0) {
      return
    }

    // Get the next player in line
    const nextPlayer = this.pendingPlayerInitializations[0]
    if (nextPlayer) {
      this.requestLevelGeneration(nextPlayer.playerId, nextPlayer.socket, nextPlayer.initCallback)
    }
  }

  async onLevelGenerated(levelConfig, expectedPlayerId) {
    // Only accept level from the player we asked
    if (this.levelGenerationRequestedBy !== expectedPlayerId) {
      console.log(`Ignoring level from player ${expectedPlayerId}, expecting from ${this.levelGenerationRequestedBy}`)
      return false
    }

    // Clear timeout and reset state
    if (this.levelGenerationTimeout) {
      clearTimeout(this.levelGenerationTimeout)
      this.levelGenerationTimeout = null
    }

    this.level = levelConfig
    this.pather = new Pather(this.level)
    this.levelGenerationInProgress = false
    const generatedBy = this.levelGenerationRequestedBy
    this.levelGenerationRequestedBy = null

    console.log(`Level generated successfully by player ${generatedBy}`)

    // Initialize all pending players
    const playersToInit = [...this.pendingPlayerInitializations]
    this.pendingPlayerInitializations = []

    for (const { initCallback } of playersToInit) {
      try {
        await initCallback()
      } catch (error) {
        console.error('Error initializing player after level generation:', error)
      }
    }

    return true
  }

  onPlayerDisconnected(playerId) {
    // Clean up level generation state if this player was responsible
    if (this.levelGenerationRequestedBy === playerId) {
      console.log(`Player ${playerId} disconnected while generating level, trying next player`)
      if (this.levelGenerationTimeout) {
        clearTimeout(this.levelGenerationTimeout)
        this.levelGenerationTimeout = null
      }
      this.levelGenerationInProgress = false
      this.levelGenerationRequestedBy = null

      // Remove this player from pending list and try next
      this.pendingPlayerInitializations = this.pendingPlayerInitializations.filter(p => p.playerId !== playerId)
      this.tryNextLevelGeneration()
    } else {
      // Remove from pending list if they were waiting
      this.pendingPlayerInitializations = this.pendingPlayerInitializations.filter(p => p.playerId !== playerId)
    }
  }
}

export default new LevelGenerationManager()
