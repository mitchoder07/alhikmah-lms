// Generate 3 logo options for Al-Bashir Academy (ABA)
import sharp from 'sharp'
import path from 'path'

const OUT_DIR = path.join(process.cwd(), 'download')

// Logo 1: Classic — Open book with ABA monogram
const logo1 = (size: number) => `<svg width="${size}" height="${size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006633"/>
      <stop offset="100%" stop-color="#003d1f"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="60" fill="url(#g1)"/>
  <path d="M 100 140 Q 200 100 200 140 Q 200 100 300 140 L 300 280 Q 200 240 200 280 Q 200 240 100 280 Z" fill="none" stroke="#D4AF37" stroke-width="6"/>
  <line x1="200" y1="140" x2="200" y2="280" stroke="#D4AF37" stroke-width="4"/>
  <text x="200" y="350" font-family="Georgia, serif" font-size="48" font-weight="bold" fill="#D4AF37" text-anchor="middle" dominant-baseline="central">ABA</text>
</svg>`

// Logo 2: Modern — Graduation cap
const logo2 = (size: number) => `<svg width="${size}" height="${size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006633"/>
      <stop offset="100%" stop-color="#003d1f"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="60" fill="url(#g2)"/>
  <polygon points="200,100 340,160 200,220 60,160" fill="#D4AF37"/>
  <path d="M 120 180 L 120 240 Q 200 280 280 240 L 280 180" fill="none" stroke="#D4AF37" stroke-width="5"/>
  <line x1="340" y1="160" x2="340" y2="210" stroke="#D4AF37" stroke-width="3"/>
  <circle cx="340" cy="215" r="8" fill="#D4AF37"/>
  <text x="200" y="330" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="#D4AF37" text-anchor="middle" dominant-baseline="central">ABA</text>
</svg>`

// Logo 3: Elegant — Circular monogram with decorative border
const logo3 = (size: number) => `<svg width="${size}" height="${size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006633"/>
      <stop offset="100%" stop-color="#003d1f"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="60" fill="url(#g3)"/>
  <circle cx="200" cy="170" r="110" fill="none" stroke="#D4AF37" stroke-width="3"/>
  <circle cx="200" cy="170" r="95" fill="none" stroke="#D4AF37" stroke-width="1" stroke-dasharray="4,4"/>
  <circle cx="200" cy="170" r="75" fill="#D4AF37" opacity="0.1"/>
  <text x="200" y="170" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#D4AF37" text-anchor="middle" dominant-baseline="central">ABA</text>
  <text x="200" y="320" font-family="Georgia, serif" font-size="14" fill="#D4AF37" text-anchor="middle" letter-spacing="3">AL-BASHIR</text>
  <text x="200" y="345" font-family="Georgia, serif" font-size="11" fill="#D4AF37" opacity="0.7" text-anchor="middle" letter-spacing="2">ACADEMY</text>
</svg>`

async function main() {
  await sharp(Buffer.from(logo1(400))).png().toFile(path.join(OUT_DIR, 'logo-option-1-book.png'))
  await sharp(Buffer.from(logo2(400))).png().toFile(path.join(OUT_DIR, 'logo-option-2-gradcap.png'))
  await sharp(Buffer.from(logo3(400))).png().toFile(path.join(OUT_DIR, 'logo-option-3-monogram.png'))
  console.log('3 ABA logo options generated in /download/')
}

main().catch(e => { console.error(e); process.exit(1) })
