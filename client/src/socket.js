import { io } from 'socket.io-client'

const playerId =
  localStorage.getItem('playerId') ||
  'player-' + Math.random().toString(36).substr(2, 9)
localStorage.setItem('playerId', playerId)

const socket = io(`http://${window.location.hostname}:3000`, {
  query: { playerId }, // Send playerId as a query parameter, no validation for now
})

export default socket