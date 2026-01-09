const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const roots = [
  path.resolve(__dirname, '..', 'public'),
  path.resolve(__dirname, '..', 'src', 'assets')
]
const exts = ['.png', '.jpg', '.jpeg']

async function convertFile(file) {
  const out = file + '.webp'
  try {
    const statIn = fs.statSync(file)
    if (fs.existsSync(out)) {
      const statOut = fs.statSync(out)
      if (statOut.mtimeMs >= statIn.mtimeMs) {
        return // already up-to-date
      }
    }
  } catch (e) {
    // ignore
  }

  try {
    await sharp(file)
      .webp({ quality: 80 })
      .toFile(out)
    console.log('converted:', file, '->', out)
  } catch (err) {
    console.error('failed to convert', file, err)
  }
}

function walk(dir) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full))
    } else {
      const ext = path.extname(full).toLowerCase()
      if (exts.includes(ext)) results.push(full)
    }
  })
  return results
}

async function main() {
  for (const root of roots) {
    const files = walk(root)
    for (const f of files) {
      await convertFile(f)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
