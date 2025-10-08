const createStore = (initialValue, validator) => {
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
    if (validator && !validator(newValue)) {
      console.error('Invalid value for store', value, newValue)
      return false
    }
    value = newValue
    subscribers.forEach(callback => callback(value))
    return true
  }
  const update = fn => set(fn(value))
  const get = () => value

  return { subscribe, set, update, get }
}

export default createStore
