import throttle from '../../shared/throttle'

class PlayerControls {
  constructor(app, world, player, socket, minimap) {
    this.app = app
    this.world = world
    this.player = player
    this.socket = socket
    this.minimap = minimap
    this.startListening()
  }

  startListening() {
    let isMouseDown = false
    let lastMouseEvent = null

    // Start updating the target position on mousedown
    this.app.canvas.addEventListener('mousedown', (event) => {
      if (!this.player) return

      isMouseDown = true
      lastMouseEvent = event
      updateTargetPosition(event)
    })

    // Update the target position on mousemove if the mouse button is held down
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

    // Stop updating the target position on mouseup
    this.app.canvas.addEventListener('mouseup', (event) => {
      isMouseDown = false
      lastMouseEvent = event
    })

    // on mouse scroll, change player weapon
    this.app.canvas.addEventListener('wheel', (event) => {
      if (!this.player) return

      // if control is pressed, swap armor, otherwise weapon

      if (event.altKey) {
        const delta = Math.sign(event.deltaY)
        if (delta > 0) {
          this.player.selectNextArmor()
        } else {
          this.player.selectPreviousArmor()
        }
        this.socket.emit('playerSetArmor', this.player.tempArmorIndex)
        return
      }

      const delta = Math.sign(event.deltaY)
      if (delta > 0) {
        this.player.selectNextWeapon()
      } else {
        this.player.selectPreviousWeapon()
      }
      this.socket.emit('playerSetWeapon', this.player.tempWeaponIndex)
    })

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Tab') {
        this.minimap.toggleCentered()
      }
    })

    // only pass new position to server at most every 50ms (20 times per second)
    const throttledSetTargetOnServer = throttle((target) => {
      this.socket.emit('playerSetTarget', target)
    }, 50)

    const updateTargetPosition = (event) => {
      const rect = this.app.canvas.getBoundingClientRect()

      // stage is shifted to center the player
      // so we need to account for that offset
      const target = {
        x: event.clientX - rect.left - this.world.x,
        y: event.clientY - rect.top - this.world.y,
      }

      this.player.setTarget(target)
      throttledSetTargetOnServer(target)
    }
  }
}

export default PlayerControls
