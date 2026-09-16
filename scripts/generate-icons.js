const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const rootDir = '/home/martin_shih77/easy-composer';
const publicDir = path.join(rootDir, 'public');
const iconsDir = path.join(publicDir, 'icons');

// 1. Standard App Icon SVG (512x512) - Beautiful dark studio squircle with gold accents and 1 5 6 numbered notation
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1f2e" />
      <stop offset="50%" stop-color="#10121a" />
      <stop offset="100%" stop-color="#08090e" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="70%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="innerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="medallionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#232736" />
      <stop offset="100%" stop-color="#12141d" />
    </linearGradient>
    <linearGradient id="micGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded squircle with subtle gold border -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="url(#goldGrad)" stroke-width="3.5" stroke-opacity="0.4" />

  <!-- Ambient radial warmth -->
  <circle cx="256" cy="256" r="230" fill="url(#innerGlow)" />

  <!-- Subtle musical waves & dynamic curves -->
  <path d="M 40 400 Q 148 350, 256 395 T 472 390" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" stroke-opacity="0.25" stroke-dasharray="8 6" />
  <path d="M 40 422 Q 148 372, 256 417 T 472 412" fill="none" stroke="#64748b" stroke-width="1.5" stroke-opacity="0.2" />

  <!-- Outer gold accent ring -->
  <circle cx="256" cy="256" r="195" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="12 8" />
  <circle cx="256" cy="256" r="176" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.08" />

  <!-- Center Studio Medallion -->
  <circle cx="256" cy="256" r="156" fill="url(#medallionGrad)" stroke="url(#goldGrad)" stroke-width="5" />
  <circle cx="256" cy="256" r="147" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.12" />

  <!-- Numbered Musical Notation Identity: 1 5 6 -->
  <g id="notes" filter="url(#glow)">
    <!-- Note 1 -->
    <text x="160" y="266" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="102" fill="url(#goldGrad)" text-anchor="middle">1</text>
    <!-- High Octave Dot above 1 -->
    <circle cx="160" cy="162" r="8.5" fill="#fef08a" />

    <!-- Note 5 -->
    <text x="256" y="284" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="120" fill="#ffffff" text-anchor="middle">5</text>
    <!-- Sharp / Accent Tone Mark above 5 -->
    <circle cx="256" cy="148" r="9.5" fill="#fbbf24" />

    <!-- Note 6 -->
    <text x="352" y="266" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="102" fill="url(#goldGrad)" text-anchor="middle">6</text>
    <!-- Low Octave Dot below 6 -->
    <circle cx="352" cy="298" r="8.5" fill="#fbbf24" />

    <!-- Rhythm Underline Beams (Eighth + Sixteenth notes) -->
    <rect x="128" y="316" width="256" height="8.5" rx="4.25" fill="url(#goldGrad)" />
    <rect x="228" y="332" width="156" height="6.5" rx="3.25" fill="#fef08a" />
  </g>

  <!-- Studio Karaoke Mic Badge (top right) -->
  <g transform="translate(378, 88)">
    <circle cx="24" cy="24" r="28" fill="#151722" stroke="url(#micGrad)" stroke-width="3" />
    <path d="M 24 12 C 20.7 12 18 14.7 18 18 L 18 25 C 18 28.3 20.7 31 24 31 C 27.3 31 30 28.3 30 25 L 30 18 C 30 14.7 27.3 12 24 12 Z" fill="url(#micGrad)" />
    <path d="M 14 23 C 14 28.5 18.5 33 24 33 C 29.5 33 34 28.5 34 23" fill="none" stroke="url(#micGrad)" stroke-width="2.5" stroke-linecap="round" />
    <line x1="24" y1="33" x2="24" y2="39" stroke="url(#micGrad)" stroke-width="2.5" stroke-linecap="round" />
  </g>
</svg>`;

// 2. Maskable Icon SVG (512x512) - Full bleed background, all graphics safely within 80% safe zone
const iconMaskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1f2e" />
      <stop offset="50%" stop-color="#10121a" />
      <stop offset="100%" stop-color="#08090e" />
    </linearGradient>
    <linearGradient id="goldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="70%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="innerGlowM" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="medallionGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#232736" />
      <stop offset="100%" stop-color="#12141d" />
    </linearGradient>
    <linearGradient id="micGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="glowM" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Full bleed square background -->
  <rect width="512" height="512" fill="url(#bgGradM)" />

  <!-- Ambient radial warmth -->
  <circle cx="256" cy="256" r="230" fill="url(#innerGlowM)" />

  <!-- Subtle musical waves across safe area -->
  <path d="M 60 395 Q 158 350, 256 390 T 452 385" fill="none" stroke="url(#goldGradM)" stroke-width="2.5" stroke-opacity="0.25" stroke-dasharray="8 6" />
  <path d="M 60 415 Q 158 370, 256 410 T 452 405" fill="none" stroke="#64748b" stroke-width="1.5" stroke-opacity="0.2" />

  <!-- Outer gold accent ring within safe zone -->
  <circle cx="256" cy="256" r="185" fill="none" stroke="url(#goldGradM)" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="12 8" />

  <!-- Center Studio Medallion -->
  <circle cx="256" cy="256" r="150" fill="url(#medallionGradM)" stroke="url(#goldGradM)" stroke-width="4.5" />
  <circle cx="256" cy="256" r="141" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.12" />

  <!-- Numbered Musical Notation Identity: 1 5 6 -->
  <g id="notesM" filter="url(#glowM)">
    <!-- Note 1 -->
    <text x="162" y="266" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="98" fill="url(#goldGradM)" text-anchor="middle">1</text>
    <circle cx="162" cy="166" r="8" fill="#fef08a" />

    <!-- Note 5 -->
    <text x="256" y="283" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="116" fill="#ffffff" text-anchor="middle">5</text>
    <circle cx="256" cy="152" r="9" fill="#fbbf24" />

    <!-- Note 6 -->
    <text x="350" y="266" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="98" fill="url(#goldGradM)" text-anchor="middle">6</text>
    <circle cx="350" cy="296" r="8" fill="#fbbf24" />

    <!-- Rhythm Underline Beams -->
    <rect x="132" y="314" width="248" height="8" rx="4" fill="url(#goldGradM)" />
    <rect x="230" y="329" width="150" height="6" rx="3" fill="#fef08a" />
  </g>

  <!-- Studio Karaoke Mic Badge (positioned within maskable 80% safe zone) -->
  <g transform="translate(352, 102)">
    <circle cx="22" cy="22" r="25" fill="#151722" stroke="url(#micGradM)" stroke-width="2.5" />
    <path d="M 22 11 C 19 11 16.5 13.5 16.5 16.5 L 16.5 23 C 16.5 26 19 28.5 22 28.5 C 25 28.5 27.5 26 27.5 23 L 27.5 16.5 C 27.5 13.5 25 11 22 11 Z" fill="url(#micGradM)" />
    <path d="M 13 21 C 13 26 17 30 22 30 C 27 30 31 26 31 21" fill="none" stroke="url(#micGradM)" stroke-width="2.2" stroke-linecap="round" />
    <line x1="22" y1="30" x2="22" y2="35" stroke="url(#micGradM)" stroke-width="2.2" stroke-linecap="round" />
  </g>
</svg>`;

// 3. Favicon SVG (128x128) - Highly readable, bolded at small browser tab sizes
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <linearGradient id="favBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1f2e" />
      <stop offset="100%" stop-color="#0a0b10" />
    </linearGradient>
    <linearGradient id="favGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="30%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <!-- Rounded squircle background -->
  <rect width="128" height="128" rx="28" fill="url(#favBg)" />
  <rect width="124" height="124" x="2" y="2" rx="26" fill="none" stroke="url(#favGold)" stroke-width="2" stroke-opacity="0.4" />

  <!-- Center Gold Ring -->
  <circle cx="64" cy="64" r="46" fill="#141620" stroke="url(#favGold)" stroke-width="3" />

  <!-- Notes: 1 5 6 -->
  <!-- 1 -->
  <text x="40" y="67" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Arial, sans-serif" font-weight="900" font-size="32" fill="url(#favGold)" text-anchor="middle">1</text>
  <circle cx="40" cy="35" r="3" fill="#fef08a" />

  <!-- 5 -->
  <text x="64" y="72" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Arial, sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle">5</text>
  <circle cx="64" cy="31" r="3.5" fill="#fbbf24" />

  <!-- 6 -->
  <text x="88" y="67" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Arial, sans-serif" font-weight="900" font-size="32" fill="url(#favGold)" text-anchor="middle">6</text>
  <circle cx="88" cy="76" r="3" fill="#fbbf24" />

  <!-- Rhythm Underline Beams -->
  <rect x="30" y="81" width="68" height="3.5" rx="1.75" fill="url(#favGold)" />
  <rect x="56" y="87" width="42" height="2.5" rx="1.25" fill="#fef08a" />
</svg>`;

async function buildIcons() {
  console.log('Writing SVG files...');
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), iconSvg);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), iconMaskableSvg);
  fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

  console.log('Rendering PNG icons via Sharp...');
  // Standard PWA icons (512, 192)
  await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512.png'));
  await sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192.png'));

  // Maskable PWA icons (512, 192)
  await sharp(Buffer.from(iconMaskableSvg)).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));
  await sharp(Buffer.from(iconMaskableSvg)).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));

  // Apple Touch Icon (180x180) - full bleed so iOS squircle mask cuts cleanly
  await sharp(Buffer.from(iconMaskableSvg)).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(iconMaskableSvg)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Multi-size favicon.ico using python PIL
  console.log('Generating multi-size favicon.ico...');
  const favPngPath = path.join('/tmp', 'favicon_base.png');
  await sharp(Buffer.from(faviconSvg)).resize(256, 256).png().toFile(favPngPath);

  execSync(`python3 -c "
from PIL import Image
base = Image.open('${favPngPath}')
base.save('${path.join(publicDir, 'favicon.ico')}', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
"`);

  console.log('All icons built successfully!');
}

buildIcons().catch(err => {
  console.error('Build icons error:', err);
  process.exit(1);
});
