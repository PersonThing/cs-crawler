/*
// Create a store instance
const countStore = createStore(0);

// Subscribe to changes
const unsubscribe = countStore.subscribe((value) => {
  console.log("Count updated:", value);
});

// Update the store value
countStore.set(1);
countStore.set(2);

// Unsubscribe
unsubscribe();
*/

// Create a simple store
export const createStore = (initialValue) => {
  let value = initialValue;
  const subscribers = [];

  const subscribe = (callback) => {
    subscribers.push(callback);
    callback(value); // Call the callback immediately with the current value

    return () => {
      // Unsubscribe function
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  };

  const set = (newValue) => {
    value = newValue;
    subscribers.forEach((callback) => callback(value));
  };

  return { subscribe, set };
};