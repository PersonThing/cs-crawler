import createStore from "../../../shared/create-store"

const { get, subscribe, set } = createStore({ width: window.innerWidth, height: window.innerHeight })

// subscribe for window resize events and set the new screen size
window.addEventListener('resize', () => {
  set({ width: window.innerWidth, height: window.innerHeight })
})

export default { get, subscribe }