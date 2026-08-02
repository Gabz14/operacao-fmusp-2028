import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

const W = 512
const H = 512
const px = Buffer.alloc(W * H * 4)

const bg = [10, 10, 15, 255]
const gold = [245, 197, 24, 255]
const dark = [22, 22, 30, 255]

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    // fundo: radial escuro
    const dx = x - W / 2
    const dy = y - H / 2
    const r = Math.sqrt(dx * dx + dy * dy) / (W / 2)
    const t = Math.max(0, 1 - r)
    px[i] = Math.round(bg[0] + 24 * t)
    px[i + 1] = Math.round(bg[1] + 24 * t)
    px[i + 2] = Math.round(bg[2] + 34 * t)
    px[i + 3] = 255
  }
}

// anel dourado
const cx = W / 2
const cy = H / 2
const R1 = 168
const R2 = 196
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    if (d >= R1 && d <= R2) {
      const i = (y * W + x) * 4
      px[i] = gold[0]; px[i + 1] = gold[1]; px[i + 2] = gold[2]
    }
  }
}

// estrela central (pontos de texto "M")
const text = await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: Buffer.from(
        `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle"
            font-family="Arial, sans-serif" font-weight="bold" font-size="300" fill="#f5c518">M</text>
        </svg>`
      ),
    },
  ])
  .png()
  .toBuffer()

const final = await sharp(px, { raw: { width: W, height: H, channels: 4 } })
  .composite([{ input: text }])
  .png()
  .toBuffer()

await sharp(final).resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp(final).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(final).resize(512, 512).png().toFile('public/icons/maskable-512.png')
console.log('ícones gerados')
