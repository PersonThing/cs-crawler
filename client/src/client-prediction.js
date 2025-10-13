import socket from './socket.js'
import throttle from '#shared/utils/throttle.js'
import LivingEntityState from '#shared/state/living-entity-state.js'
import * as PIXI from 'pixi.js'
import { DEBUG } from '#shared/config/constants.js'

class ClientPrediction {
  constructor() {
    // Input tracking for local player only
    this.localPlayerId = null
    this.inputSequence = 0
    this.pendingInputs = [] // Inputs sent but not yet acknowledged by server

    // State history for all players (Map of playerId -> array of snapshots)
    this.stateHistories = new Map() // Per-player circular buffers of client state snapshots
    this.maxHistorySize = 120 // ~2 seconds at 60fps

    // Reconciliation settings
    this.reconciliationThresholdLocal = 2.0 // pixels for local player
    this.reconciliationThresholdRemote = 5.0 // pixels for remote players

    // Predicted entities - map of playerId to LivingEntityState (includes local player)
    this.predictedEntities = new Map()
    
    // Debug visualization using global DEBUG store
    this.debugSprites = new Map() // playerId -> debug sprite (server position)
    this.trailSprites = new Map() // playerId -> array of trail sprites (client history)
    this.debugContainer = null
    this.app = null // Will be set when debug is initialized
    this.world = null // Will be set when debug is initialized
    
    // Subscribe to DEBUG store changes
    this.unsubscribeDebug = DEBUG.subscribe(enabled => {
      if (enabled && !this.debugContainer && this.world) {
        this.createDebugContainer()
      } else if (!enabled && this.debugContainer) {
        this.destroyDebugContainer()
      }
    })
    
    // Pather instance (set when level loads)
    this.pather = null

    // Throttled network send
    this.throttledSendInput = throttle(input => {
      socket.emit('setTarget', input)
    }, 50)
  }

  // Set the pather (should be called when level is loaded)
  setPather(pather) {
    this.pather = pather
    // Update pather for all existing predicted entities
    for (const entity of this.predictedEntities.values()) {
      entity.pather = pather
    }
  }

  // Initialize debug visualization (call from client.js when app is ready)
  initDebug(app, world) {
    this.app = app
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
    
    console.log('Client Prediction Debug Enabled - Red dots=server positions, Blue trails=client prediction history')
    
    // Create debug sprites and trails for existing players
    for (const [playerId, entity] of this.predictedEntities) {
      this.createDebugSprite(playerId, { x: entity.x, y: entity.y })
      this.updateTrailSprites(playerId)
    }
  }

  // Destroy debug container and cleanup sprites
  destroyDebugContainer() {
    if (!this.debugContainer) return
    
    // Clean up all debug sprites
    for (const [playerId, debugSprite] of this.debugSprites) {
      debugSprite.destroy()
    }
    this.debugSprites.clear()
    
    // Clean up all trail sprites
    for (const [playerId, trailSprites] of this.trailSprites) {
      for (const sprite of trailSprites) {
        sprite.destroy()
      }
    }
    this.trailSprites.clear()
    
    // Remove and destroy container
    this.world.removeChild(this.debugContainer)
    this.debugContainer.destroy()
    this.debugContainer = null
    
    console.log('Client Prediction Debug Disabled')
  }

  // Create debug sprite for a player
  createDebugSprite(playerId, serverState) {
    if (!DEBUG.get() || !this.debugContainer || !serverState) return
    
    if (this.debugSprites.has(playerId)) return // Already exists
    
    // Create new debug sprite (red circle for server position)
    const debugSprite = new PIXI.Graphics()
    debugSprite.circle(0, 0, 10)
    debugSprite.fill(0xff0000) // Red for server position
    debugSprite.alpha = 0.4
    debugSprite.x = serverState.x
    debugSprite.y = serverState.y
    
    this.debugSprites.set(playerId, debugSprite)
    this.debugContainer.addChild(debugSprite)
  }

  // Update debug sprite position
  updateDebugSprite(playerId, serverState) {
    if (!DEBUG.get() || !this.debugContainer || !serverState) return
    
    let debugSprite = this.debugSprites.get(playerId)
    
    if (!debugSprite) {
      this.createDebugSprite(playerId, serverState)
    } else {
      // Update debug sprite position to server state
      debugSprite.x = serverState.x
      debugSprite.y = serverState.y
    }
  }

  // Remove debug sprite for disconnected player
  removeDebugSprite(playerId) {
    const debugSprite = this.debugSprites.get(playerId)
    if (debugSprite) {
      if (this.debugContainer) {
        this.debugContainer.removeChild(debugSprite)
      }
      debugSprite.destroy()
      this.debugSprites.delete(playerId)
    }
  }

  // Update trail sprites for a player's state history
  updateTrailSprites(playerId) {
    if (!DEBUG.get() || !this.debugContainer) return
    
    const history = this.stateHistories.get(playerId)
    if (!history) return
    
    // Get or create trail sprites array for this player
    if (!this.trailSprites.has(playerId)) {
      this.trailSprites.set(playerId, [])
    }
    
    const trailSprites = this.trailSprites.get(playerId)
    
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
      sprite.alpha = 0.1 + (i / history.length) * 0.1 // Recent states are more opaque
    }
  }

  // Remove trail sprites for disconnected player
  removeTrailSprites(playerId) {
    const trailSprites = this.trailSprites.get(playerId)
    if (trailSprites) {
      for (const sprite of trailSprites) {
        if (this.debugContainer) {
          this.debugContainer.removeChild(sprite)
        }
        sprite.destroy()
      }
      this.trailSprites.delete(playerId)
    }
  }

  // Add or update a player for prediction (treats all players uniformly)
  setPlayer(player, isLocalPlayer = false) {
    const playerId = player.playerId || player.id
    
    // Create a client-side prediction entity using the actual LivingEntityState class
    const predictedEntity = new LivingEntityState({
      id: playerId + '_prediction',
      label: (player.label || player.username) + '_prediction',
      pather: this.pather,
      x: player.x,
      y: player.y,
      color: player.color,
      targetItem: null, // Don't predict item interactions
      inventory: {}, // Empty object for inventory (not needed for movement prediction)
    })

    // Copy current movement state
    predictedEntity.target = player.target ? { ...player.target } : null
    predictedEntity.tempTarget = player.tempTarget ? { ...player.tempTarget } : null
    predictedEntity.path = player.path ? [...player.path] : []
    predictedEntity.rotation = player.rotation
    predictedEntity.maxSpeed = player.maxSpeed

    this.predictedEntities.set(playerId, predictedEntity)
    
    // Create debug sprite and trail if debug is enabled
    this.createDebugSprite(playerId, { x: player.x, y: player.y })
    this.updateTrailSprites(playerId)
    
    // Track local player ID for input handling
    if (isLocalPlayer) {
      this.localPlayerId = playerId
    }
  }

  // Remove a player from prediction
  removePlayer(playerId) {
    this.predictedEntities.delete(playerId)
    this.stateHistories.delete(playerId) // Clean up state history
    this.removeDebugSprite(playerId) // Clean up debug sprite
    this.removeTrailSprites(playerId) // Clean up trail sprites
    if (this.localPlayerId === playerId) {
      this.localPlayerId = null
    }
  }

  // Add an input to be processed (for local player only)
  addInput(target) {
    if (!this.localPlayerId) return
    
    const localEntity = this.predictedEntities.get(this.localPlayerId)
    if (!localEntity) return

    this.inputSequence++

    const input = {
      target: { ...target },
      inputSequence: this.inputSequence,
      timestamp: Date.now(),
    }

    // Store input in pending list
    this.pendingInputs.push(input)

    // Apply input to local player's predicted entity
    localEntity.setTarget(input.target)

    // Save state snapshot after applying input
    this.saveStateSnapshot()

    // Send to server (throttled)
    this.throttledSendInput({
      target,
      inputSequence: this.inputSequence,
    })
  }

  // Save current state to history (for all players)
  saveStateSnapshot() {
    const timestamp = Date.now()
    
    for (const [playerId, entity] of this.predictedEntities) {
      const snapshot = {
        timestamp,
        inputSequence: playerId === this.localPlayerId ? this.inputSequence : 0,
        x: entity.x,
        y: entity.y,
        rotation: entity.rotation,
        target: entity.target ? { ...entity.target } : null,
        tempTarget: entity.tempTarget ? { ...entity.tempTarget } : null,
        path: [...entity.path],
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
    }
  }

  // Unified reconciliation method for all players
  reconcilePlayerWithServer(playerId, serverState, serverTimestamp) {
    const predictedEntity = this.predictedEntities.get(playerId)
    if (!predictedEntity || !serverState) return false

    // Update debug sprite with server state
    this.updateDebugSprite(playerId, serverState)

    const { x, y, rotation, target, tempTarget, path, lastProcessedInputSequence } = serverState
    const isLocalPlayer = playerId === this.localPlayerId
    const threshold = isLocalPlayer ? this.reconciliationThresholdLocal : this.reconciliationThresholdRemote

    if (DEBUG.get() && Math.random() < 0.05) { // 5% chance to log
      const hasTarget = predictedEntity.target ? 'has target' : 'no target'
      const pathLength = predictedEntity.path ? predictedEntity.path.length : 0
      console.log(`[DEBUG] Player ${playerId} server: (${x.toFixed(1)}, ${y.toFixed(1)}) predicted: (${predictedEntity.x.toFixed(1)}, ${predictedEntity.y.toFixed(1)}) ${hasTarget} path:${pathLength}`)
    }

    // Handle input sequence acknowledgment for local player only
    if (isLocalPlayer && lastProcessedInputSequence !== undefined) {
      this.pendingInputs = this.pendingInputs.filter(input => input.inputSequence > lastProcessedInputSequence)
    }

    // Find reference state for comparison
    let referenceState = predictedEntity // Default to current state
    if (serverTimestamp) {
      const historicalState = this.findStateAtTimestamp(playerId, serverTimestamp)
      if (historicalState) {
        referenceState = historicalState
      }
    }

    // Calculate divergence
    const dx = x - referenceState.x
    const dy = y - referenceState.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Apply corrections if divergence is too large
    if (distance > threshold) {
      console.log(`Correcting player ${playerId}: distance=${distance.toFixed(2)} (${isLocalPlayer ? 'local' : 'remote'})`)
      
      // Apply server position correction
      predictedEntity.setPosition(x, y)
      predictedEntity.rotation = rotation
      
      if (isLocalPlayer) {
        // Local player: rollback and replay inputs
        predictedEntity.stopMoving()
        for (const input of this.pendingInputs) {
          predictedEntity.setTarget(input.target)
        }
      } else {
        // Remote player: apply server movement state when correcting position
        predictedEntity.target = target ? { ...target } : null
        predictedEntity.tempTarget = tempTarget ? { ...tempTarget } : null
        predictedEntity.path = path ? [...path] : []
      }
    } else if (!isLocalPlayer) {
      // For remote players: only update movement state if it has meaningfully changed
      // This allows continued client prediction between server updates
      const targetChanged = this.hasTargetChanged(predictedEntity, target)
      const pathChanged = this.hasPathChanged(predictedEntity, path)
      
      if (targetChanged || pathChanged) {
        console.log(`Updating remote player ${playerId} movement: targetChanged=${targetChanged}, pathChanged=${pathChanged}`)
        predictedEntity.target = target ? { ...target } : null
        predictedEntity.tempTarget = tempTarget ? { ...tempTarget } : null
        predictedEntity.path = path ? [...path] : []
      }
    }

    return distance > threshold // Return whether correction was applied
  }

  // Check if target has meaningfully changed
  hasTargetChanged(entity, newTarget) {
    const currentTarget = entity.target
    
    // Both null/undefined
    if (!currentTarget && !newTarget) return false
    
    // One is null, other is not
    if (!currentTarget || !newTarget) return true
    
    // Compare positions with small threshold for floating point differences
    const threshold = 0.1
    return Math.abs(currentTarget.x - newTarget.x) > threshold || 
           Math.abs(currentTarget.y - newTarget.y) > threshold
  }

  // Check if path has meaningfully changed
  hasPathChanged(entity, newPath) {
    const currentPath = entity.path || []
    const serverPath = newPath || []
    
    // Different lengths
    if (currentPath.length !== serverPath.length) return true
    
    // Compare each path point
    const threshold = 0.1
    for (let i = 0; i < currentPath.length; i++) {
      const current = currentPath[i]
      const server = serverPath[i]
      
      if (Math.abs(current.x - server.x) > threshold || 
          Math.abs(current.y - server.y) > threshold) {
        return true
      }
    }
    
    return false
  }

  // Find state snapshot closest to the given timestamp for a specific player
  findStateAtTimestamp(playerId, targetTimestamp) {
    const history = this.stateHistories.get(playerId)
    if (!history || history.length === 0) return null

    let closest = history[0]
    let minDiff = Math.abs(closest.timestamp - targetTimestamp)

    for (const state of history) {
      const diff = Math.abs(state.timestamp - targetTimestamp)
      if (diff < minDiff) {
        minDiff = diff
        closest = state
      }
    }

    return closest
  }

  // Get the current predicted position (for local player - backward compatibility)
  getPredictedState() {
    if (!this.localPlayerId) return null
    
    const localEntity = this.predictedEntities.get(this.localPlayerId)
    if (!localEntity) return null

    return {
      x: localEntity.x,
      y: localEntity.y,
      rotation: localEntity.rotation,
      target: localEntity.target,
      tempTarget: localEntity.tempTarget,
      path: localEntity.path,
    }
  }

  // Get predicted state for any player
  getPredictedStateForPlayer(playerId) {
    const entity = this.predictedEntities.get(playerId)
    if (!entity) return null

    return {
      x: entity.x,
      y: entity.y,
      rotation: entity.rotation,
      target: entity.target,
      tempTarget: entity.tempTarget,
      path: entity.path,
    }
  }

  // Clean up old state history and pending inputs
  cleanup() {
    const now = Date.now()
    const maxAge = 3000 // 3 seconds

    // Clean up state histories for all players
    for (const [playerId, history] of this.stateHistories) {
      const filteredHistory = history.filter(state => now - state.timestamp < maxAge)
      this.stateHistories.set(playerId, filteredHistory)
    }

    // Clean up very old pending inputs (shouldn't happen normally)
    this.pendingInputs = this.pendingInputs.filter(input => now - input.timestamp < maxAge)
  }

  // Periodic update for client prediction
  tick(deltaTime) {
    // Update all predicted entities (local and remote players)
    for (const entity of this.predictedEntities.values()) {
      // Continue movement if there's a target - use actual LivingEntityState method
      entity.moveTowardTarget(deltaTime)
    }

    // Save snapshots for all players every frame (needed for reconciliation)
    this.saveStateSnapshot()

    // Update debug trail sprites occasionally
    if (DEBUG.get() && Math.random() < 0.2) { // 20% chance per frame (~12fps)
      for (const playerId of this.predictedEntities.keys()) {
        this.updateTrailSprites(playerId)
      }
    }

    // Periodic cleanup
    if (Math.random() < 0.01) {
      // ~1% chance per frame
      this.cleanup()
    }
  }

  // Cleanup resources and subscriptions
  destroy() {
    if (this.unsubscribeDebug) {
      this.unsubscribeDebug()
    }
    this.destroyDebugContainer()
  }
}

export default new ClientPrediction()
