import createStore from '#shared/stores/create-store'

const { subscribe, get, update, set } = createStore([], value => Array.isArray(value))

export default {
  subscribe,
  get,
  update,
  set,
  add: player => {
    update(players => {
      players.push(player)
      return players
    })
  },
  remove: playerId => {
    update(players => players.filter(p => p.state.playerId !== playerId))
    console.log('removed player', playerId)
  },
  getLocalPlayer: () => get().find(p => p.isLocalPlayer) || null,
}
