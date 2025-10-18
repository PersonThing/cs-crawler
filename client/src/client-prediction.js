import * as PIXI from 'pixi.js'
import { DEBUG } from '#shared/config/constants.js'

class ClientPrediction {
  constructor() {
    // State history for all players (Map of playerId -> array of snapshots)
    this.stateHistories = new Map() // Per-player buffers of client state snapshots
    this.maxHistorySize = 60

    // Reconciliation needed if position off by more than this (in pixels)
    this.reconciliationThreshold = 50.0

    // Debug visualization using global DEBUG store
    this.serverPositionSprites = new Map() // playerId -> debug sprite (server position)
    this.clientStateTrailSprites = new Map() // playerId -> array of trail sprites (client history)
    this.debugContainer = null
    this.world = null // Will be set when debug is initialized

    // Subscribe to DEBUG store changes
    this.unsubscribeDebug = DEBUG.subscribe(enabled => {
      if (enabled && !this.debugContainer && this.world) {
        this.createDebugContainer()
      } else if (!enabled && this.debugContainer) {
        this.destroyDebugContainer()
      }
    })

    // Frame counter for periodic tasks
    this.frameCounter = 0
  }

  setPlayer(player) {
    const playerId = player.playerId
    this.updateServerSprite(playerId, player.state)
  }

  removePlayer(playerId) {
    this.stateHistories.delete(playerId)
    this.removeDebugSprites(playerId)
  }

  reconcileWithServer(entity, serverState, serverTimestamp) {
    if (!entity || !serverState) return false
    const playerId = entity.playerId

    this.updateServerSprite(playerId, serverState)

    // Look for any historical state that was close enough to the server state
    // we only keep history for a limited number of frames, as long as one of those frames was close enough to the server state, we'll assume our predictions are ok
    const nearestHistoricalState = this.findNearestHistoricalState(playerId, serverState)
    let correctionNeeded = false
    if (!nearestHistoricalState) {
      // No historical states available, compare with current state
      const dx = serverState.x - entity.x
      const dy = serverState.y - entity.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      correctionNeeded = distance > this.reconciliationThreshold
    } else {
      // Check if the nearest historical state was within threshold
      const dx = serverState.x - nearestHistoricalState.x
      const dy = serverState.y - nearestHistoricalState.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      correctionNeeded = distance > this.reconciliationThreshold
    }
    
    // Also check if target changed meaningfully
    correctionNeeded = correctionNeeded || this.hasTargetChanged(entity, serverState.target)
    
    if (correctionNeeded) {
      console.log('applying correction', playerId, 'distance:', Math.sqrt((serverState.x - entity.x) ** 2 + (serverState.y - entity.y) ** 2))
      // Start by moving entity to wherever the server state says it was at serverTimestamp
      entity.x = serverState.x
      entity.y = serverState.y
      entity.rotation = serverState.rotation
      // should only setTarget if not local player, as local player is in charge of their own target
      entity.setTarget(serverState.target)

      // Then simulate passage of time to advance to where we should be now (since serverTimestamp will be older than current time)
      const currentTimestamp = Date.now()
      for (let t = serverTimestamp; t < currentTimestamp; t++) {
        // tick movement in 1ms increments rather than 1 big jump
        // this gives opportunity to switch path points
        entity.moveTowardTarget(1)
      }
    }
    
    return correctionNeeded
  }

  // Check if target has meaningfully changed
  hasTargetChanged(entity, newTarget) {
    const currentTarget = entity.target

    // Both null/undefined
    if (!currentTarget && !newTarget) return false

    // One is null, other is not
    if (!currentTarget || !newTarget) return true

    // Compare positions with small threshold
    const threshold = 5 // pixels
    return Math.abs(currentTarget.x - newTarget.x) > threshold || Math.abs(currentTarget.y - newTarget.y) > threshold
  }

  // Find nearest historical state that was within distance threshold from server state
  findNearestHistoricalState(playerId, serverState) {
    const history = this.stateHistories.get(playerId)
    if (!history || history.length === 0) return null

    const { x: serverX, y: serverY } = serverState
    let closestState = null
    let minDistance = Infinity

    // Search through history for the state closest to the server position
    for (const state of history) {
      const dx = serverX - state.x
      const dy = serverY - state.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        minDistance = distance
        closestState = state
      }

      // Early exit if we found a state within threshold - no correction needed
      if (distance <= this.reconciliationThreshold) {
        // we can also delete any states older than this one now
        this.stateHistories.set(playerId, history.filter(s => s.timestamp > state.timestamp))
        return state
      }
    }

    // Return the closest state we found (might still be outside threshold)
    return closestState
  }

  // Periodic update for client prediction
  tick(deltaTime, players) {
    this.frameCounter++

    const timestamp = Date.now()

    // Update all predicted entities
    for (const entity of players) {
      const playerId = entity.playerId
      entity.moveTowardTarget(deltaTime)

      // save a snapshot of current state for reconciliation
      const snapshot = {
        timestamp,
        x: entity.x,
        y: entity.y,
        rotation: entity.rotation,
        target: entity.target ? { ...entity.target } : null,
      }

      // Get or create history array for this player
      if (!this.stateHistories.has(playerId)) {
        this.stateHistories.set(playerId, [])
      }

      const history = this.stateHistories.get(playerId)
      history.push(snapshot)

      // Keep history size bounded
      if (history.length > this.maxHistorySize) {
        history.shift()
      }

      this.updateClientTrailSprites(playerId)
    }
  }

  // Initialize debug visualization (call from client.js when app is ready)
  initDebug(world) {
    this.world = world

    // Create debug container if debug is currently enabled
    if (DEBUG.get()) {
      this.createDebugContainer()
    }
  }

  // Create debug container and sprites
  createDebugContainer() {
    if (this.debugContainer || !this.world) return

    this.debugContainer = new PIXI.Container()
    this.debugContainer.zIndex = 1000 // Render on top
    this.world.addChild(this.debugContainer)
  }

  // Destroy debug container and cleanup sprites
  destroyDebugContainer() {
    if (!this.debugContainer) return

    // Clean up all debug sprites
    for (const [playerId, debugSprite] of this.serverPositionSprites) {
      debugSprite.destroy()
    }
    this.serverPositionSprites.clear()

    // Clean up all trail sprites
    for (const [playerId, trailSprites] of this.clientStateTrailSprites) {
      for (const sprite of trailSprites) {
        sprite.destroy()
      }
    }
    this.clientStateTrailSprites.clear()

    // Remove and destroy container
    this.world.removeChild(this.debugContainer)
    this.debugContainer.destroy()
    this.debugContainer = null

    console.log('Client Prediction Debug Disabled')
  }

  updateServerSprite(playerId, serverState) {
    if (!DEBUG.get() || !this.debugContainer || !serverState) return

    // Server state
    let serverPositionSprite = this.serverPositionSprites.get(playerId)
    if (!serverPositionSprite) {
      // Create server position sprite (red circle)
      if (this.serverPositionSprites.has(playerId)) return // Already exists
      const debugSprite = new PIXI.Graphics()
      debugSprite.circle(0, 0, 10)
      debugSprite.fill(0xff0000)
      debugSprite.alpha = 0.4
      debugSprite.x = serverState.x
      debugSprite.y = serverState.y
      this.serverPositionSprites.set(playerId, debugSprite)
      this.debugContainer.addChild(debugSprite)
    } else {
      // Update server position sprite
      serverPositionSprite.x = serverState.x
      serverPositionSprite.y = serverState.y
    }
  }

  updateClientTrailSprites(playerId) {
    if (!DEBUG.get() || !this.debugContainer) return

    // Client state trail - blue dot for each saved state on the stack
    const history = this.stateHistories.get(playerId)
    if (!history) return
    if (!this.clientStateTrailSprites.has(playerId)) {
      this.clientStateTrailSprites.set(playerId, [])
    }
    const trailSprites = this.clientStateTrailSprites.get(playerId)
    // Remove excess sprites if history got smaller
    while (trailSprites.length > history.length) {
      const sprite = trailSprites.pop()
      this.debugContainer.removeChild(sprite)
      sprite.destroy()
    }
    // Update existing sprites and create new ones as needed
    for (let i = 0; i < history.length; i++) {
      const state = history[i]
      let sprite = trailSprites[i]
      if (!sprite) {
        // Create new trail sprite (small blue circle)
        sprite = new PIXI.Graphics()
        sprite.circle(0, 0, 4) // Smaller than debug sprite
        sprite.fill(0x0088ff) // Blue for client history
        sprite.alpha = 0.1 + (i / history.length) * 0.1 // Fade from old to recent

        trailSprites.push(sprite)
        this.debugContainer.addChild(sprite)
      }
      // Update position and alpha based on age
      sprite.x = state.x
      sprite.y = state.y
      sprite.alpha = 0.2 + (i / history.length) * 0.05 // Recent states are more opaque
    }
  }

  removeDebugSprites(playerId) {
    const serverPositionSprite = this.serverPositionSprites.get(playerId)
    if (serverPositionSprite) {
      if (this.debugContainer) {
        this.debugContainer.removeChild(serverPositionSprite)
      }
      serverPositionSprite.destroy()
      this.serverPositionSprites.delete(playerId)
    }

    const clientStateTrailSprites = this.clientStateTrailSprites.get(playerId)
    if (clientStateTrailSprites) {
      for (const sprite of clientStateTrailSprites) {
        if (this.debugContainer) {
          this.debugContainer.removeChild(sprite)
        }
        sprite.destroy()
      }
      this.clientStateTrailSprites.delete(playerId)
    }
  }

  destroy() {
    if (this.unsubscribeDebug) {
      this.unsubscribeDebug()
    }
    this.destroyDebugContainer()
  }
}

export default new ClientPrediction()
