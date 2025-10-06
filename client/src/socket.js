import { io } from 'socket.io-client'

import usernameStore from './stores/username-store.js'

const playerId = 'player-' + Math.random().toString(36).substring(2, 9)
const username = usernameStore.get()

const socket = io(`http://${window.location.hostname}:3000`, {
  query: { playerId, username }, // Send playerId and username as query parameters
})

socket.playerId = playerId

usernameStore.subscribe(name => {
  socket.emit('setUsername', name)
})

export default socket
