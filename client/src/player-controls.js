import { SampleItems } from '../../shared/items.js'
import throttle from '../../shared/throttle.js'
import debounce from '../../shared/debounce.js'
import socket from './socket.js'

class PlayerControls {
  constructor(app, world, player, minimap, hud) {
    this.app = app
    this.world = world
    this.player = player
    this.minimap = minimap
    this.hud = hud
    this.startListening()

    // when player inventory changes, send to server
    const debouncedSetInventory = debounce((content) => {
      socket.emit('inventoryChanged', content)
    }, 100)
    this.player.inventory.store.subscribe(debouncedSetInventory)
  }

  startListening() {
    let isMouseDown = false
    let lastMouseEvent = null

    this.app.canvas.addEventListener('mousedown', (event) => {
      if (!this.player) return

      isMouseDown = true
      lastMouseEvent = event
      updateTargetPosition(event)
    })

    this.app.canvas.addEventListener('mousemove', (event) => {
      if (!this.player || !isMouseDown) return

      lastMouseEvent = event
      updateTargetPosition(event)
    })

    this.app.ticker.add((time) => {
      if (isMouseDown && lastMouseEvent) {
        updateTargetPosition(lastMouseEvent)
      }
    })

    this.app.canvas.addEventListener('mouseup', (event) => {
      isMouseDown = false
      lastMouseEvent = event
    })

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        this.minimap.toggleCentered()
        event.preventDefault()
      } else if (event.key === 'b' || event.key === 'i') {
        this.hud.toggleInventory(this.app.screen.width, this.app.screen.height)
        event.preventDefault()
      } else if (event.key === 'n') {
        // temp: generate and pick up a random sample item
        this.player.inventory.pickup(generateRandomItem())
      } else if (event.key === 'N') {
        // temp: fill inventory with random items
        this.player.inventory.reset()
        while (this.player.inventory.pickup(generateRandomItem())) {}
      } else if (event.key === 'M') {
        // temp: reset inventory
        this.player.inventory.reset()
      }
    })

    const generateRandomItem = () => {
      return structuredClone(
        SampleItems[Math.floor(Math.random() * SampleItems.length)]
      )
    }

    // only pass new position to server at most every 50ms (20 times per second)
    const throttledSetTargetOnServer = throttle((target) => {
      socket.emit('setTarget', target)
    }, 50)

    const updateTargetPosition = (event) => {
      const rect = this.app.canvas.getBoundingClientRect()

      // stage is shifted to center the player
      // so we need to account for that offset
      const target = {
        x: Math.round(event.clientX - rect.left - this.world.x),
        y: Math.round(event.clientY - rect.top - this.world.y),
      }

      this.player.setTarget(target)
      throttledSetTargetOnServer(target)
    }
  }
}

export default PlayerControls
