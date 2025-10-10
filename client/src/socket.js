import { io } from 'socket.io-client'
import createPersistedStore from '#shared/stores/create-persisted-store.js'
import usernameStore from './stores/username-store.js'

const playerIdStore = createPersistedStore('playerId', 'player-' + Math.random().toString(36).substring(2, 9))
const playerId = playerIdStore.get()
const username = usernameStore.get()

const socket = io(`http://${window.location.hostname}:3000`, {
  query: { playerId, username }, // Send playerId and username as query parameters
})
usernameStore.subscribe(name => socket.emit('setUsername', name))

export default socket
