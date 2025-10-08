import { generateRandomItem, generateRandomItemOfType } from '#shared/config/items.js'
import throttle from '#shared/utils/throttle.js'
import socket from './socket.js'
import cursorPositionStore from './stores/cursor-position-store.js'
import { DEBUG } from '#shared/config/constants.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import usernameStore from './stores/username-store.js'
import groundItemsStore from '../../shared/stores/ground-items-store.js'

class PlayerControls {
  constructor(app, world, minimap, hud) {
    this.app = app
    this.world = world
    this.minimap = minimap
    this.hud = hud
    this.isMouseDown = false
    this.isRightMouseDown = false

    this.playerState = playerSpriteStore.getLocalPlayer().state
    this.unsubscribeFromplayerSpriteStore = playerSpriteStore.subscribe(player => {
      if (player.isLocalPlayer) {
        console.log('playercontrols player set', player)
        this.playerState = player.state
      }
    })

    this.startListening()
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
      n: event => {
        // temp: generate and pick up a random sample item
        this.playerState.inventory.pickup(generateRandomItem())
      },
      m: event => {
        // temp: fill inventory with random items
        while (this.playerState.inventory.pickup(generateRandomItem())) {}
      },
      ',': event => {
        // temp: reset inventory
        this.playerState.inventory.reset()
      },
      g: event => {
        // temp: generate a bunch of items on the ground around the player
        groundItemsStore.add({
          item: generateRandomItem(),
          position: {
            x: this.playerState.x,
            y: this.playerState.y,
          },
        })
      },
      v: event => {
        groundItemsStore.get().forEach(i => groundItemsStore.remove(i.item.id))
      },
      f3: event => {
        // prompt the user for a new username
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
  throttledSetTargetOnServer = throttle(target => {
    socket.emit('setTarget', target)
  }, 50)

  updateTargetPosition() {
    const target = cursorPositionStore.get()
    if (this.isMouseDown) {
      this.playerState.setTarget(target)
      this.throttledSetTargetOnServer(target)
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
    if (!this.playerState) return

    // handle right-click for attacking
    if (event.button === 2) {
      this.playerState.startAttacking(cursorPositionStore.get())
      this.isRightMouseDown = true
      return
    }

    // if item on cursor, drop it
    if (this.playerState.inventory.cursor != null) {
      // stage is shifted to center the player
      // so we need to account for that offset
      groundItemsStore.placeLocally({
        item: this.playerState.inventory.cursor,
        position: {
          x: this.playerState.x,
          y: this.playerState.y,
        },
      })
      this.playerState.inventory.setCursor(null)
      return
    }

    // otherwise we can move

    this.isMouseDown = true
    this.updateTargetPosition()
  }

  onMouseMove(event) {
    const rect = this.app.canvas.getBoundingClientRect()
    cursorPositionStore.set({
      x: Math.round(event.clientX - rect.left - this.world.x),
      y: Math.round(event.clientY - rect.top - this.world.y),
    })

    if (!this.playerState || !this.isMouseDown) return

    this.updateTargetPosition()
  }

  onMouseUp(event) {
    if (event.button === 2) {
      this.playerState.stopAttacking()
      this.isRightMouseDown = false
      return
    }
    this.isMouseDown = false
  }

  onTick(time) {
    if (this.isRightMouseDown) {
      this.playerState.attackTarget = cursorPositionStore.get()
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
