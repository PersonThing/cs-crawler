class PlayerControls {
  constructor(app, world, player, socket, centerViewOnPlayer) {
    this.app = app
    this.world = world
    this.player = player
    this.socket = socket
    this.centerViewOnPlayer = centerViewOnPlayer
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

    // Function to update the target position
    const updateTargetPosition = (event) => {
      const rect = this.app.canvas.getBoundingClientRect()

      // stage is shifted to center the player
      // so we need to account for that offset
      const target = {
        x: event.clientX - rect.left - (this.centerViewOnPlayer ? this.world.x : 0),
        y: event.clientY - rect.top - (this.centerViewOnPlayer ? this.world.y : 0)
      }

      this.player.setTarget(target)
      this.socket.emit('playerSetTarget', target)
    }
  }
}

export default PlayerControls
