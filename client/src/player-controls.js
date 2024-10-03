class PlayerControls {
  constructor(player, app, socket, centerViewOnPlayer) {
    this.player = player
    this.app = app
    this.socket = socket
    this.centerViewOnPlayer = centerViewOnPlayer
    this.startListening()
  }

  startListening() {
    let isMouseDown = false

    // Start updating the target position on mousedown
    this.app.canvas.addEventListener('mousedown', (event) => {
      if (!this.player) return

      isMouseDown = true
      updateTargetPosition(event)
    })

    // Update the target position on mousemove if the mouse button is held down
    this.app.canvas.addEventListener('mousemove', (event) => {
      if (!this.player || !isMouseDown) return

      updateTargetPosition(event)
    })

    // Stop updating the target position on mouseup
    this.app.canvas.addEventListener('mouseup', () => {
      isMouseDown = false
    })

    // Function to update the target position
    const updateTargetPosition = (event) => {
      const rect = this.app.canvas.getBoundingClientRect()

      // stage is shifted to center the player
      // so we need to account for that offset
      const target = {
        x: event.clientX - rect.left - (this.centerViewOnPlayer ? this.app.stage.x : 0),
        y: event.clientY - rect.top - (this.centerViewOnPlayer ? this.app.stage.y : 0)
      }

      this.player.setTarget(target)
      this.socket.emit('playerSetTarget', target)
    }
  }
}

export default PlayerControls
