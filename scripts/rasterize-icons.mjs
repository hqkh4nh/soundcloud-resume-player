import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import sharp from 'sharp'

const sizes = [16, 48, 128]
const sourcePath = 'public/icons/icon.svg'
const outputDir = 'public/icons'

const svg = await readFile(sourcePath)
await mkdir(outputDir, { recursive: true })

for (const size of sizes) {
  const outputPath = join(outputDir, `icon-${size}.png`)
  await mkdir(dirname(outputPath), { recursive: true })
  const buffer = await sharp(svg).resize(size, size).png().toBuffer()
  await writeFile(outputPath, buffer)
  console.log(`wrote ${outputPath}`)
}
