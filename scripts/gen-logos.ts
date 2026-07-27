// Generate the Al-Bashir Academy logo in GREEN + GOLD
// Icons: arch fills the circle edge-to-edge
import sharp from 'sharp'
import path from 'path'

const OUT_DIR = path.join(process.cwd(), 'public')

// Full logo — transparent background, LARGE clear text
const fullLogo = (w: number, h: number) => `<svg width="${w}" height="${h}" viewBox="0 0 360 440" xmlns="http://www.w3.org/2000/svg">

  <!-- ICON: Pointed ogee arch with book, bars, arrow -->
  <g transform="translate(180, 160)">
    <!-- Outer arch — pointed ogee (GREEN, thick) -->
    <path d="M -100 -50 Q -100 -125 -58 -150 Q -30 -170 0 -180 Q 30 -170 58 -150 Q 100 -125 100 -50 L 100 75 Q 100 83 92 83 L -92 83 Q -100 83 -100 75 Z"
          fill="none" stroke="#006633" stroke-width="6"/>
    <!-- Inner arch (GOLD, thin) -->
    <path d="M -88 -45 Q -88 -118 -50 -143 Q -26 -158 0 -166 Q 26 -158 50 -143 Q 88 -118 88 -45 L 88 65 Q 88 70 82 70 L -82 70 Q -88 70 -88 65 Z"
          fill="none" stroke="#D4AF37" stroke-width="2.5"/>

    <!-- Open book -->
    <path d="M -72 38 Q -72 22 -50 18 Q -25 14 0 22 Q 25 14 50 18 Q 72 22 72 38 L 72 58 Q 72 62 66 62 L -66 62 Q -72 62 -72 58 Z" fill="#D4AF37"/>
    <path d="M -68 32 Q -68 20 -47 16 Q -23 12 0 20 Q 23 12 47 16 Q 68 20 68 32 L 68 52 Q 68 56 62 56 L -62 56 Q -68 56 -68 52 Z" fill="#006633"/>
    <path d="M -63 32 Q -44 22 -2 24 L -2 52 Q -44 48 -63 50 Z" fill="white" opacity="0.35"/>
    <path d="M 2 24 Q 44 22 63 32 L 63 50 Q 44 48 2 52 Z" fill="white" opacity="0.35"/>
    <line x1="0" y1="20" x2="0" y2="56" stroke="#D4AF37" stroke-width="2"/>

    <!-- 4 bars (GREEN) -->
    <rect x="-44" y="-50" width="18" height="65" fill="#006633" rx="2"/>
    <rect x="-21" y="-74" width="18" height="89" fill="#006633" rx="2"/>
    <rect x="2" y="-96" width="18" height="111" fill="#006633" rx="2"/>
    <rect x="25" y="-115" width="18" height="130" fill="#006633" rx="2"/>

    <!-- Curved GOLD arrow -->
    <path d="M -58 -40 Q -22 -82 24 -125" fill="none" stroke="#D4AF37" stroke-width="4.5" stroke-linecap="round"/>
    <polygon points="24,-125 40,-134 36,-114" fill="#D4AF37"/>
  </g>

  <!-- AL-BASHIR — LARGE, BOLD, GREEN -->
  <text x="180" y="310" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="bold" fill="#006633" text-anchor="middle" letter-spacing="4">AL-BASHIR</text>

  <!-- Gold lines + ACADEMY -->
  <line x1="50" y1="335" x2="120" y2="335" stroke="#D4AF37" stroke-width="3"/>
  <text x="180" y="341" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="bold" fill="#D4AF37" text-anchor="middle" letter-spacing="8">ACADEMY</text>
  <line x1="240" y1="335" x2="310" y2="335" stroke="#D4AF37" stroke-width="3"/>

  <!-- Diamond -->
  <line x1="40" y1="370" x2="140" y2="370" stroke="#D4AF37" stroke-width="1.5" opacity="0.6"/>
  <text x="180" y="376" font-family="serif" font-size="14" fill="#D4AF37" text-anchor="middle">✦</text>
  <line x1="220" y1="370" x2="320" y2="370" stroke="#D4AF37" stroke-width="1.5" opacity="0.6"/>

  <!-- Slogan -->
  <text x="180" y="408" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#006633" text-anchor="middle" letter-spacing="4" font-weight="bold">KNOWLEDGE • INTEGRITY • EXCELLENCE</text>
</svg>`

// Compact circular icon — arch fills the circle edge-to-edge
const iconLogo = (size: number) => `<svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006633"/>
      <stop offset="100%" stop-color="#003d1f"/>
    </linearGradient>
  </defs>

  <!-- Green circle — fills entire viewBox -->
  <circle cx="100" cy="100" r="100" fill="url(#bg)"/>

  <!-- Pointed ogee arch (GOLD) — fills circle edge to edge -->
  <path d="M 40 65 Q 40 15 72 -5 Q 86 -15 100 -15 Q 114 -15 128 -5 Q 160 15 160 65 L 160 155 Q 160 162 152 162 L 48 162 Q 40 162 40 155 Z"
        fill="none" stroke="#D4AF37" stroke-width="4"/>
  <path d="M 48 66 Q 48 20 76 4 Q 88 -5 100 -5 Q 112 -5 124 4 Q 152 20 152 66 L 152 150 Q 152 154 146 154 L 54 154 Q 48 154 48 150 Z"
        fill="none" stroke="#D4AF37" stroke-width="1.5" opacity="0.4"/>

  <!-- Open book (GOLD + GREEN) -->
  <path d="M 60 132 Q 60 120 74 116 Q 87 112 100 120 Q 113 112 126 116 Q 140 120 140 132 L 140 148 Q 140 152 134 152 L 66 152 Q 60 152 60 148 Z" fill="#D4AF37"/>
  <path d="M 63 128 Q 63 118 75 115 Q 87 113 100 119 Q 113 113 125 115 Q 137 118 137 128 L 137 145 Q 137 148 132 148 L 68 148 Q 63 148 63 145 Z" fill="#006633"/>
  <line x1="100" y1="119" x2="100" y2="148" stroke="#D4AF37" stroke-width="1.5"/>

  <!-- 4 bars (GOLD) — fill width -->
  <rect x="66" y="92" width="13" height="35" fill="#D4AF37" rx="1.5"/>
  <rect x="83" y="70" width="13" height="57" fill="#D4AF37" rx="1.5"/>
  <rect x="100" y="48" width="13" height="79" fill="#D4AF37" rx="1.5"/>
  <rect x="117" y="28" width="13" height="99" fill="#D4AF37" rx="1.5"/>

  <!-- Curved arrow (WHITE) -->
  <path d="M 58 88 Q 80 55 115 26" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>
  <polygon points="115,26 128,18 124,38" fill="white"/>
</svg>`

async function main() {
  await sharp(Buffer.from(fullLogo(360, 440))).png().toFile(path.join(OUT_DIR, 'logo-full.png'))
  await sharp(Buffer.from(iconLogo(192))).png().toFile(path.join(OUT_DIR, 'icon-192.png'))
  await sharp(Buffer.from(iconLogo(512))).png().toFile(path.join(OUT_DIR, 'icon-512.png'))
  await sharp(Buffer.from(iconLogo(180))).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'))
  await sharp(Buffer.from(iconLogo(32))).png().toFile(path.join(OUT_DIR, 'favicon-32.png'))
  console.log('GREEN+GOLD icons generated — arch fills circle!')
}

main().catch(e => { console.error(e); process.exit(1) })
