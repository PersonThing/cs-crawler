import { DEBUG } from '#shared/config/constants.js'
import cursorPositionStore from './stores/cursor-position-store.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import socket from './socket.js'
import usernameStore from './stores/username-store.js'
import clientPrediction from './client-prediction.js'

class PlayerControls {
  constructor(app, world, minimap, hud) {
    this.app = app
    this.world = world
    this.minimap = minimap
    this.hud = hud
    this.isMouseDown = false
    this.isRightMouseDown = false

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
  }
  
  // Helper method to stop movement with client prediction
  stopMovement() {
    if (!this.player) return
    
    const currentPosition = { x: this.player.x, y: this.player.y }
    clientPrediction.addInput(currentPosition)
    this.player.setTarget(currentPosition)
  }

  startListening() {
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    this.app.canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.app.canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.app.canvas.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.app.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this))
    this.app.canvas.addEventListener('wheel', this.onMouseWheel.bind(this))
    this.app.ticker.add(this.onTick.bind(this))

    this.keyHandlers = {
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
      q: event => {
        const target = cursorPositionStore.get()
        const abilityResult = this.hud.actionBar.useSlot3(target)
        if (abilityResult === false) {
          // Stop movement if ability returns false
          this.stopMovement()
        }
      },
      w: event => {
        const target = cursorPositionStore.get()
        const abilityResult = this.hud.actionBar.useSlot4(target)
        if (abilityResult === false) {
          // Stop movement if ability returns false
          this.stopMovement()
        }
      },
      e: event => {
        const target = cursorPositionStore.get()
        const abilityResult = this.hud.actionBar.useSlot5(target)
        if (abilityResult === false) {
          // Stop movement if ability returns false
          this.stopMovement()
        }
      },
      r: event => {
        const target = cursorPositionStore.get()
        const abilityResult = this.hud.actionBar.useSlot6(target)
        if (abilityResult === false) {
          // Stop movement if ability returns false
          this.stopMovement()
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
  }

  stopListening() {
    console.log('playerControls.stopListening')
    window.removeEventListener('keydown', this.onKeyDown)
    this.app.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.app.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.app.canvas.removeEventListener('mouseup', this.onMouseUp)
    this.app.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.app.canvas.removeEventListener('wheel', this.onMouseWheel)
    if (this.app.ticker != null) {
      this.app.ticker.remove(this.onTick)
    }
    this.unsubscribeFromplayerSpriteStore()
  }

  onMouseWheel(event) {
    if (event.deltaY < 0) {
      this.minimap.zoomIn()
    } else {
      this.minimap.zoomOut()
    }
    event.preventDefault()
    return false
  }

  // only pass new position to server at most every 50ms (20 times per second)
  updateTargetPosition() {
    const target = cursorPositionStore.get()
    if (this.isMouseDown) {
      // Use client prediction - movement happens at full framerate in tick()
      clientPrediction.addInput(target)
      
      // Still set on local player for immediate visual feedback
      this.player.setTarget(target)
    }
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase()
    const keyHandler = this.keyHandlers[key]
    if (keyHandler != null) {
      if (!keyHandler(event)) {
        event.preventDefault()
        return false
      }
    }
  }

  onMouseDown(event) {
    if (!this.player) return

    const target = cursorPositionStore.get()

    // handle right-click for slot 2 ability
    if (event.button === 2) {
      this.isRightMouseDown = true
      
      // Try to use slot 2 ability (right-click)
      const abilityResult = this.hud.actionBar.useSlot2(target)
      if (abilityResult === true) {
        // Ability allows movement, set target
        this.updateTargetPosition()
      } else if (abilityResult === false) {
        // Ability stops movement, stop where we are
        this.stopMovement()
      }
      return
    }

    // handle left-click for slot 1 ability
    if (event.button === 0) {
      // if item on cursor, drop it
      if (this.player.inventory.cursor != null) {
        socket.emit('dropCursorItem')
        return
      }

      this.isMouseDown = true
      
      // Try to use slot 1 ability
      const abilityResult = this.hud.actionBar.useSlot1(target)
      if (abilityResult === true) {
        // Ability allows movement, set target
        this.updateTargetPosition()
      } else if (abilityResult === false) {
        // Ability stops movement, stop where we are
        this.stopMovement()
      } else {
        // No ability in slot, normal movement
        this.updateTargetPosition()
      }
    }
  }

  onMouseMove(event) {
    const rect = this.app.canvas.getBoundingClientRect()
    cursorPositionStore.set({
      x: Math.round(event.clientX - rect.left - this.world.x),
      y: Math.round(event.clientY - rect.top - this.world.y),
    })

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

  onTick(time) {
    // Update client prediction at full framerate
    clientPrediction.tick(this.app.ticker.deltaMS)
    
    if (this.isRightMouseDown) {
      this.player.attackTarget = cursorPositionStore.get()
    } else if (this.isMouseDown) {
      this.updateTargetPosition()
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
