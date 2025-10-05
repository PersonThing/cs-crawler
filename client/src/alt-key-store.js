import createStore from '../../shared/create-store.js'

const { subscribe, set, get } = createStore(false)

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