import createStore from '#shared/stores/create-store.js'

const { subscribe, set, get } = createStore(false, value => typeof value === 'boolean')

window.addEventListener('keydown', event => {
  if (event.key === 'Alt') {
    set(true)
    event.preventDefault()
  }
})

window.addEventListener('keyup', event => {
  if (event.key === 'Alt') {
    set(false)
    event.preventDefault()
  }
})

export default { subscribe, get }