import { DEBUG } from '#shared/config/constants.js'
import cursorPositionStore from './stores/cursor-position-store.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import socket from './socket.js'
import usernameStore from './stores/username-store.js'
import clientPrediction from './client-prediction.js'
import throttle from '#shared/utils/throttle.js'
import explorationState from './exploration-state.js'

class PlayerControls {
  constructor(app, world, minimap, hud) {
    this.app = app
    this.world = world
    this.minimap = minimap
    this.hud = hud
    this.isMouseDown = false
    this.isRightMouseDown = false
    this.isShiftKeyDown = false
    this.screenCursorX = 0
    this.screenCursorY = 0

    this.player = playerSpriteStore.getLocalPlayer().state
    clientPrediction.setPlayer(this.player)

    this.unsubscribeFromplayerSpriteStore = playerSpriteStore.subscribe(sprite => {
      if (sprite.isLocalPlayer) {
        console.log('playercontrols player set', sprite.state)
        this.player = sprite.state
        clientPrediction.setPlayer(this.player)
      }
    })

    this.startListening()

    // Throttled network send
    this.throttledSendTarget = throttle(target => {
      this.player.setTarget(target)
      socket.emit('setTarget', target)
    }, 50)
  }

  stopMovement() {
    if (!this.player) return
    const currentPosition = { x: this.player.x, y: this.player.y }
    this.throttledSendTarget(currentPosition)
  }

  startListening() {
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
    this.app.canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.app.canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.app.canvas.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.app.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this))
    this.app.canvas.addEventListener('wheel', this.onMouseWheel.bind(this))
    this.app.ticker.add(this.tick.bind(this))

    this.keyDownHandlers = {
      shift: event => {
        // stop moving when shift is held down
        this.isShiftKeyDown = true
        this.stopMovement()
      },
      f2: event => {
        console.log('toggling debug mode', !DEBUG.get())
        DEBUG.set(!DEBUG.get())
      },
      tab: event => {
        this.minimap.toggleCentered()
        return false
      },
      b: event => {
        this.hud.toggleInventory()
      },
      c: event => {
        this.hud.toggleCharacterSheet()
      },
      f1: event => {
        this.hud.toggleHelp()
      },

      escape: event => {
        this.hud.closeAllHuds()
        event.preventDefault()
        return false
      },

      // Action bar ability hotkeys
      q: event => this.hud.actionBar.useSlot3(cursorPositionStore.get()),
      w: event => this.hud.actionBar.useSlot4(cursorPositionStore.get()),
      e: event => this.hud.actionBar.useSlot5(cursorPositionStore.get()),
      r: event => {
        this.hud.actionBar.useSlot6(cursorPositionStore.get())
        if (event.ctrlKey) {
          return true
        }
      },

      // temp debug methods for items
      n: event => {
        socket.emit('pickupRandomItem')
      },
      m: event => {
        socket.emit('fillInventoryWithRandomItems')
      },
      ',': event => {
        socket.emit('resetInventory')
      },
      g: event => {
        socket.emit('generateGroundItemsAtPlayer')
      },
      // Debug exploration state
      f3: event => {
        explorationState.reset()
        console.log('Exploration state reset')
      },
      v: event => {
        socket.emit('clearGroundItems')
      },

      // temp method for setting username
      f3: event => {
        const newUsername = prompt('Enter new username:', usernameStore.get() || '')
        if (newUsername != null && newUsername.trim().length > 0) {
          if (!usernameStore.set(newUsername.trim())) {
            alert('Invalid username, must be 1-20 characters long.')
          }
        }
      },
    }

    this.keyUpHandlers = {
      shift: event => {
        this.isShiftKeyDown = false
      },
    }
  }

  stopListening() {
    console.log('playerControls.stopListening')
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.app.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.app.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.app.canvas.removeEventListener('mouseup', this.onMouseUp)
    this.app.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.app.canvas.removeEventListener('wheel', this.onMouseWheel)
    if (this.app.ticker != null) {
      this.app.ticker.remove(this.tick)
    }
    this.unsubscribeFromplayerSpriteStore()
  }

  onMouseWheel(event) {
    if (event.ctrlKey) return true // don't disable zooming

    if (event.deltaY < 0) {
      this.minimap.zoomIn()
    } else {
      this.minimap.zoomOut()
    }
    event.preventDefault()
    return false
  }

  updateCursorWorldPosition() {
    // Convert screen coordinates to world coordinates
    cursorPositionStore.set({
      x: Math.round(this.screenCursorX - this.world.x),
      y: Math.round(this.screenCursorY - this.world.y),
    })
  }

  // update target position based on mouse position in world, and send to server in a throttled manner
  updateTargetPosition() {
    if (this.isShiftKeyDown) {
      // don't update target position if shift is held down - it stops movement
      return
    }

    const target = cursorPositionStore.get()
    if (this.isMouseDown) {
      // Check if the target position has been explored
      if (!explorationState.canPathTo(target.x, target.y)) {
        console.log('Cannot move to unexplored area at', target)
        this.showCannotMoveIndicator(target)
        return
      }

      this.throttledSendTarget(target)
    }
  }

  showCannotMoveIndicator(position) {
    // Create a visual indicator that the area cannot be accessed
    // This could be enhanced with a proper UI indicator later
    console.log(`⚠️ Area not explored: (${Math.round(position.x)}, ${Math.round(position.y)})`)
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase()
    const keyHandler = this.keyDownHandlers[key]
    if (keyHandler != null) {
      if (!keyHandler(event)) {
        event.preventDefault()
        return false
      }
    }
  }

  onKeyUp(event) {
    const key = event.key.toLowerCase()
    const keyHandler = this.keyUpHandlers[key]
    if (keyHandler != null) {
      if (!keyHandler(event)) {
        event.preventDefault()
        return false
      }
    }
  }

  onMouseDown(event) {
    if (!this.player) return

    if (event.button === 2) {
      this.isRightMouseDown = true
      this.updateTargetPosition()
      return
    }

    if (event.button === 0) {
      if (this.player.inventory.cursor != null) {
        socket.emit('dropCursorItem')
        return
      }
      this.isMouseDown = true
      this.updateTargetPosition()
    }
  }

  onMouseMove(event) {
    const rect = this.app.canvas.getBoundingClientRect()
    this.screenCursorX = event.clientX - rect.left
    this.screenCursorY = event.clientY - rect.top
    
    // Update world coordinates immediately
    this.updateCursorWorldPosition()

    if (!this.player || !this.isMouseDown) return

    this.updateTargetPosition()
  }

  onMouseUp(event) {
    if (event.button === 2) {
      this.player.stopAttacking()
      this.isRightMouseDown = false
      return
    }
    this.isMouseDown = false
  }

  tick(time) {
    // Always update cursor world position to account for world movement
    this.updateCursorWorldPosition()
    
    if (this.isShiftKeyDown && this.player.target != null) {
      this.stopMovement()
    }

    if (this.isRightMouseDown) {
      this.hud.actionBar.useSlot2(cursorPositionStore.get())
      this.updateTargetPosition()
    } else if (this.isMouseDown) {
      if (this.isShiftKeyDown) {
        // holding shift, use slot 1 ability @ mouse cursor
        this.hud.actionBar.useSlot1(cursorPositionStore.get())
      } else {
        // not holding shift, move to mouse cursor
        this.updateTargetPosition()
      }
    }
  }

  onContextMenu(event) {
    // prevent context menu on right-click
    event.preventDefault()
    return false
  }

  destroy() {
    if (this.app != null) {
      this.app.canvas.removeEventListener('mousedown', this.onMouseDown)
      this.app.canvas.removeEventListener('mousemove', this.onMouseMove)
      this.app.canvas.removeEventListener('mouseup', this.onMouseUp)
      this.app.canvas.removeEventListener('wheel', this.onMouseWheel)
    }
    window.removeEventListener('keydown', this.onKeyDown)
  }
}

export default PlayerControls
