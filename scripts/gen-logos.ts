// Generate the Al-Bashir Academy logo in GREEN + GOLD
// Clear, large, readable text
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

    <!-- Open book at base -->
    <!-- Gold bottom layer -->
    <path d="M -72 38 Q -72 22 -50 18 Q -25 14 0 22 Q 25 14 50 18 Q 72 22 72 38 L 72 58 Q 72 62 66 62 L -66 62 Q -72 62 -72 58 Z"
          fill="#D4AF37"/>
    <!-- Green top layer -->
    <path d="M -68 32 Q -68 20 -47 16 Q -23 12 0 20 Q 23 12 47 16 Q 68 20 68 32 L 68 52 Q 68 56 62 56 L -62 56 Q -68 56 -68 52 Z"
          fill="#006633"/>
    <!-- Page lines -->
    <path d="M -63 32 Q -44 22 -2 24 L -2 52 Q -44 48 -63 50 Z" fill="white" opacity="0.35"/>
    <path d="M 2 24 Q 44 22 63 32 L 63 50 Q 44 48 2 52 Z" fill="white" opacity="0.35"/>
    <line x1="0" y1="20" x2="0" y2="56" stroke="#D4AF37" stroke-width="2"/>

    <!-- 4 vertical bars (GREEN) — increasing height -->
    <rect x="-44" y="-50" width="18" height="65" fill="#006633" rx="2"/>
    <rect x="-21" y="-74" width="18" height="89" fill="#006633" rx="2"/>
    <rect x="2" y="-96" width="18" height="111" fill="#006633" rx="2"/>
    <rect x="25" y="-115" width="18" height="130" fill="#006633" rx="2"/>

    <!-- Curved GOLD arrow -->
    <path d="M -58 -40 Q -22 -82 24 -125" fill="none" stroke="#D4AF37" stroke-width="4.5" stroke-linecap="round"/>
    <polygon points="24,-125 40,-134 36,-114" fill="#D4AF37"/>
  </g>

  <!-- AL-BASHIR — LARGE, BOLD, GREEN, very readable -->
  <text x="180" y="310" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="bold" fill="#006633" text-anchor="middle" letter-spacing="4">AL-BASHIR</text>

  <!-- Gold lines + ACADEMY — GOLD, clear -->
  <line x1="50" y1="335" x2="120" y2="335" stroke="#D4AF37" stroke-width="3"/>
  <text x="180" y="341" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="bold" fill="#D4AF37" text-anchor="middle" letter-spacing="8">ACADEMY</text>
  <line x1="240" y1="335" x2="310" y2="335" stroke="#D4AF37" stroke-width="3"/>

  <!-- Decorative diamond -->
  <line x1="40" y1="370" x2="140" y2="370" stroke="#D4AF37" stroke-width="1.5" opacity="0.6"/>
  <text x="180" y="376" font-family="serif" font-size="14" fill="#D4AF37" text-anchor="middle">✦</text>
  <line x1="220" y1="370" x2="320" y2="370" stroke="#D4AF37" stroke-width="1.5" opacity="0.6"/>

  <!-- Slogan — clear, readable -->
  <text x="180" y="408" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#006633" text-anchor="middle" letter-spacing="4" font-weight="bold">KNOWLEDGE • INTEGRITY • EXCELLENCE</text>
</svg>`

// Compact circular icon
const iconLogo = (size: number) => `<svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006633"/>
      <stop offset="100%" stop-color="#003d1f"/>
    </linearGradient>
  </defs>

  <!-- Green circle -->
  <circle cx="100" cy="100" r="96" fill="url(#bg)"/>

  <!-- Pointed ogee arch (GOLD) -->
  <path d="M 52 58 Q 52 22 76 6 Q 88 -2 100 -2 Q 112 -2 124 6 Q 148 22 148 58 L 148 150 Q 148 155 142 155 L 58 155 Q 52 155 52 150 Z"
        fill="none" stroke="#D4AF37" stroke-width="3.5"/>
  <path d="M 59 59 Q 59 26 80 12 Q 90 6 100 6 Q 110 6 120 12 Q 141 26 141 59 L 141 146 Q 141 149 137 149 L 63 149 Q 59 149 59 146 Z"
        fill="none" stroke="#D4AF37" stroke-width="1.2" opacity="0.4"/>

  <!-- Open book (GOLD bottom, GREEN top) -->
  <path d="M 68 128 Q 68 117 80 114 Q 90 111 100 118 Q 110 111 120 114 Q 132 117 132 128 L 132 142 Q 132 145 128 145 L 72 145 Q 68 145 68 142 Z"
        fill="#D4AF37"/>
  <path d="M 71 124 Q 71 116 81 113 Q 91 111 100 116 Q 109 111 119 113 Q 129 116 129 124 L 129 139 Q 129 141 125 141 L 75 141 Q 71 141 71 139 Z"
        fill="#006633"/>
  <line x1="100" y1="116" x2="100" y2="141" stroke="#D4AF37" stroke-width="1.2"/>

  <!-- 4 bars (GOLD) -->
  <rect x="74" y="90" width="10" height="32" fill="#D4AF37" rx="1"/>
  <rect x="88" y="72" width="10" height="50" fill="#D4AF37" rx="1"/>
  <rect x="102" y="52" width="10" height="70" fill="#D4AF37" rx="1"/>
  <rect x="116" y="36" width="10" height="86" fill="#D4AF37" rx="1"/>

  <!-- Curved arrow (WHITE) -->
  <path d="M 66 86 Q 84 58 112 34" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
  <polygon points="112,34 124,26 120,46" fill="white"/>
</svg>`

async function main() {
  await sharp(Buffer.from(fullLogo(360, 440))).png().toFile(path.join(OUT_DIR, 'logo-full.png'))
  await sharp(Buffer.from(iconLogo(192))).png().toFile(path.join(OUT_DIR, 'icon-192.png'))
  await sharp(Buffer.from(iconLogo(512))).png().toFile(path.join(OUT_DIR, 'icon-512.png'))
  await sharp(Buffer.from(iconLogo(180))).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'))
  await sharp(Buffer.from(iconLogo(32))).png().toFile(path.join(OUT_DIR, 'favicon-32.png'))
  console.log('CLEAR GREEN+GOLD logo generated!')
}

main().catch(e => { console.error(e); process.exit(1) })
