export default function throttle(func, delay) {
  let timerFlag = null
  return (...args) => {
    if (timerFlag === null) {
      func(...args) // Execute the main function
      timerFlag = setTimeout(() => {
        timerFlag = null // Clear the timerFlag to allow the main function to be executed again
      }, delay)
    }
  }
}
