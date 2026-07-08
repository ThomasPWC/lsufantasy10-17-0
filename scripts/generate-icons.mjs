// Generates public/pwa-192.png and public/pwa-512.png (dark field, "17-0" in turf
// green, drawn with a 5x7 bitmap font). Pure Node — no image libraries.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(width, height, rgb) {
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3)
    raw[row] = 0
    rgb.copy(raw, row + 1, y * width * 3, (y + 1) * width * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const GLYPHS = {
  1: ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
  7: ['XXXXX', '....X', '...X.', '..X..', '..X..', '..X..', '..X..'],
  0: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  '-': ['.....', '.....', '.....', '.XXX.', '.....', '.....', '.....'],
}
const TEXT = '17-0'
const COLS = TEXT.length * 5 + (TEXT.length - 1) // 1-col gaps
const ROWS = 7

const BG = [15, 23, 42] // slate-900
const FG = [52, 211, 153] // emerald-400

function makeIcon(size) {
  const rgb = Buffer.alloc(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    rgb[i * 3] = BG[0]
    rgb[i * 3 + 1] = BG[1]
    rgb[i * 3 + 2] = BG[2]
  }
  const scale = Math.floor((size * 0.72) / COLS)
  const w = COLS * scale
  const h = ROWS * scale
  const ox = Math.floor((size - w) / 2)
  const oy = Math.floor((size - h) / 2)
  TEXT.split('').forEach((ch, ci) => {
    const glyph = GLYPHS[ch]
    const gx = ci * 6 // 5 wide + 1 gap
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (glyph[r][c] !== 'X') continue
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = ox + (gx + c) * scale + dx
            const y = oy + r * scale + dy
            const i = (y * size + x) * 3
            rgb[i] = FG[0]
            rgb[i + 1] = FG[1]
            rgb[i + 2] = FG[2]
          }
        }
      }
    }
  })
  return png(size, size, rgb)
}

mkdirSync(PUB, { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(join(PUB, `pwa-${size}.png`), makeIcon(size))
  console.log(`Wrote public/pwa-${size}.png`)
}
