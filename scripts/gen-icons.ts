// Generate PWA icons (192x192 and 512x512) using sharp
import sharp from 'sharp'
import path from 'path'

const OUT_DIR = path.join(process.cwd(), 'public')

// SVG source: dark green circle with gold "ABA" monogram
const svg = (size: number) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006633"/>
      <stop offset="100%" stop-color="#003d1f"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#g)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.28}" font-weight="bold" fill="#D4AF37" text-anchor="middle" dominant-baseline="central">ABA</text>
</svg>`

async function main() {
  await sharp(Buffer.from(svg(192))).png().toFile(path.join(OUT_DIR, 'icon-192.png'))
  await sharp(Buffer.from(svg(512))).png().toFile(path.join(OUT_DIR, 'icon-512.png'))
  await sharp(Buffer.from(svg(180))).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'))
  // favicon
  await sharp(Buffer.from(svg(32))).png().toFile(path.join(OUT_DIR, 'favicon-32.png'))
  console.log('PWA icons generated.')
}

main().catch(e => { console.error(e); process.exit(1) })
