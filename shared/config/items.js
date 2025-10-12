// Import all item categories
import { chestItems } from './items/chest.js'
import { handsItems } from './items/hands.js'
import { feetItems } from './items/feet.js'
import { headItems } from './items/head.js'
import { weaponItems } from './items/weapons.js'
import { bonusItems } from './items/bonus.js'

// Combine all items into one array
export const SampleItems = [
  ...chestItems,
  ...handsItems,
  ...feetItems,
  ...headItems,
  ...weaponItems,
  ...bonusItems,
]

export const generateItemId = () => {
  // avoid crypto.randomUUID(), it's not available everywhere
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

export const stampItemId = item => {
  return {
    id: generateItemId(),
    ...item,
  }
}

export const generateRandomItem = () => {
  return stampItemId(SampleItems[Math.floor(Math.random() * SampleItems.length)])
}

export const generateRandomItemOfType = itemTypes => {
  const possibleItemsOfType = SampleItems.filter(item => itemTypes.includes(item.itemType))
  if (possibleItemsOfType.length === 0) {
    throw new Error(
      `cannot generate random item, no items of types: ${itemTypes.map(it => it.name).join(', ')}`
    )
  }
  return stampItemId(
    structuredClone(possibleItemsOfType[Math.floor(Math.random() * possibleItemsOfType.length)])
  )
}