import createStore from '#shared/stores/create-store'

const { get, subscribe, set } = createStore(
  {
    width: window.innerWidth,
    height: window.innerHeight,
  },
  value => value && typeof value.width === 'number' && typeof value.height === 'number'
)

// subscribe for window resize events and set the new screen size
window.addEventListener('resize', () => {
  set({
    width: window.innerWidth,
    height: window.innerHeight,
  })
})

export default { get, subscribe }
