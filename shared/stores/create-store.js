const createStore = initialValue => {
  let value = initialValue
  const subscribers = []

  const subscribe = callback => {
    subscribers.push(callback)
    callback(value)

    return () => {
      const index = subscribers.indexOf(callback)
      if (index > -1) {
        subscribers.splice(index, 1)
      }
    }
  }
  const set = newValue => {
    value = newValue
    subscribers.forEach(callback => callback(value))
  }
  const update = fn => set(fn(value))
  const get = () => value

  return { subscribe, set, update, get }
}

export default createStore