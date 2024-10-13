import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const texturesDir = path.join(__dirname, 'client/assets/textures')
const outputFilePath = path.join(__dirname, 'client/src/textures.js')

const generateTextureTree = (dir, basePath) => {
  const result = {}
  const items = fs.readdirSync(dir)

  items.forEach((item) => {
    const itemPath = path.join(dir, item)
    const relativePath = path.join(basePath, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      result[item] = generateTextureTree(itemPath, relativePath)
    } else if (stat.isFile() && path.extname(item) === '.png') {
      const key = path.basename(item, '.png')
      result[key] = relativePath.replace(/\\/g, '/')
    }
  })

  return result
}

const writeTexturesFile = () => {
  const texturesTree = generateTextureTree(texturesDir, '/assets/textures')
  const fileContent = `// THIS FILE IS GENERATED BY build-textures.js
// If npm run dev is active, as files / folders change inside the textures folder, this file will be regenerated
// Do not make changes here, they'll be blown away by the background watcher anyway

export const Textures = ${JSON.stringify(texturesTree, null, 2)}\n`
  fs.writeFileSync(outputFilePath, fileContent)
  console.log('Textures file regenerated.')
}

if (process.argv.includes('--watch')) {
  const watcher = chokidar.watch(texturesDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: true,
  })

  watcher
    .on('add', writeTexturesFile)
    .on('change', writeTexturesFile)
    .on('unlink', writeTexturesFile)
    .on('addDir', writeTexturesFile)
    .on('unlinkDir', writeTexturesFile)

  writeTexturesFile()
  console.log('Watching for changes in textures directory...')
} else {
  // Run once
  writeTexturesFile()
}
