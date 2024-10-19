import { generateRandomItem, generateRandomItemOfType } from '../../shared/items.js'
import throttle from '../../shared/throttle.js'
import debounce from '../../shared/debounce.js'
import socket from './socket.js'
import cursorPositionStore from './cursor-position-store.js'
import ItemType from '../../shared/item-type.js'
import playerItemTargetStore from './player-item-target-store.js'

class PlayerControls {
  constructor(app, world, player, minimap, hud) {
    this.app = app
    this.world = world
    this.player = player
    this.minimap = minimap
    this.hud = hud
    this.startListening()

    // when player inventory changes, send to server
    const debouncedSetInventory = debounce(content => {
      socket.emit('inventoryChanged', content)
    }, 100)
    this.player.inventory.store.subscribe(debouncedSetInventory)

    playerItemTargetStore.subscribe(target => {
      if (this.player) {
        this.player.setTargetItem(target)
      }
    })
  }

  startListening() {
    let isMouseDown = false

    this.app.canvas.addEventListener('mousedown', event => {
      if (!this.player) return

      // if item on cursor, drop it
      if (this.player.inventory.cursor != null) {
        // stage is shifted to center the player
        // so we need to account for that offset
        const target = {
          x: this.player.x,
          y: this.player.y,
        }
        this.world.placeItem(this.player.inventory.cursor, target)
        this.player.inventory.setCursor(null)
        return
      }

      // otherwise we can move

      isMouseDown = true
      updateTargetPosition()
    })

    this.app.canvas.addEventListener('mousemove', event => {
      const rect = this.app.canvas.getBoundingClientRect()
      cursorPositionStore.set({
        x: Math.round(event.clientX - rect.left - this.world.x),
        y: Math.round(event.clientY - rect.top - this.world.y),
      })
      
      if (!this.player || !isMouseDown) return

      updateTargetPosition()
    })

    this.app.ticker.add(time => {
      if (isMouseDown) {
        updateTargetPosition()
      }
    })

    this.app.canvas.addEventListener('mouseup', event => {
      isMouseDown = false
    })

    window.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        this.minimap.toggleCentered()
        event.preventDefault()
      } else if (event.key === 'b' || event.key === 'i') {
        this.hud.toggleInventory(this.app.screen.width, this.app.screen.height)
        event.preventDefault()
      } else if (event.key === 'n') {
        // temp: generate and pick up a random sample item
        this.player.inventory.pickup(generateRandomItem())
      } else if (event.key === 'm') {
        // temp: fill inventory with random items
        this.player.inventory.reset()
        while (this.player.inventory.pickup(generateRandomItem())) {}
      } else if (event.key === ',') {
        // temp: reset inventory
        this.player.inventory.reset()
      } else if (event.key === 'g') {
        for (let i=0; i<9; i++) {
          this.world.placeItem(generateRandomItem(), this.player.position)
        }
      } else if (event.key === 'h') {
        this.world.items.forEach(i => this.world.removeItem(i.item))
      }
    })

    // only pass new position to server at most every 50ms (20 times per second)
    const throttledSetTargetOnServer = throttle(target => {
      socket.emit('setTarget', target)
    }, 50)

    const updateTargetPosition = () => {
      const target = cursorPositionStore.get()
      this.player.setTarget(target)
      throttledSetTargetOnServer(target)
    }
  }
}

export default PlayerControls
