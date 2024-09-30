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
      // Calculate the target position based on the mouse event
      const rect = this.app.canvas.getBoundingClientRect()
      const targetX = event.clientX - rect.left
      const targetY = event.clientY - rect.top

      this.player.setTarget(targetX, targetY)
      this.socket.emit('playerSetTarget', { targetX, targetY })
    }
  }
}

export default PlayerControls
