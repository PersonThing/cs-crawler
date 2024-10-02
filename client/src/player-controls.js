class PlayerControls {
  constructor(player, app, socket) {
    this.player = player
    this.app = app
    this.socket = socket
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
      const targetX = event.clientX - rect.left - this.app.stage.x
      const targetY = event.clientY - rect.top - this.app.stage.y

      this.player.setTarget(targetX, targetY)
      this.socket.emit('playerSetTarget', { targetX, targetY })
    }
  }
}

export default PlayerControls
