import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="50%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="40%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="amberGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="padGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="url(#goldGrad)" stroke-width="6" stroke-opacity="0.5" />

  <!-- Subtle ambient soundwave circles -->
  <circle cx="256" cy="230" r="190" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.15" />
  <circle cx="256" cy="230" r="215" fill="none" stroke="url(#goldGrad)" stroke-width="1" stroke-opacity="0.08" stroke-dasharray="8 8" />

  <!-- Paw Print with Musical Notes -->
  <g id="paw" filter="url(#shadow)">
    <!-- Toe Pad 1 (Leftmost): with note 1 -->
    <g transform="translate(142, 135) rotate(-24)">
      <ellipse cx="0" cy="0" rx="36" ry="46" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="11" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#fbbf24" text-anchor="middle">1</text>
      <!-- High tone dot -->
      <circle cx="0" cy="-24" r="4.5" fill="#fbbf24" />
      <!-- Under-beam -->
      <line x1="-16" y1="24" x2="16" y2="24" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Toe Pad 2 (Middle-Left): with note 2 -->
    <g transform="translate(216, 92) rotate(-8)">
      <ellipse cx="0" cy="0" rx="38" ry="50" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="12" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="36" fill="#ffffff" text-anchor="middle">2</text>
      <!-- High tone dot -->
      <circle cx="0" cy="-26" r="4.5" fill="#f59e0b" />
      <!-- Under-beam -->
      <line x1="-18" y1="26" x2="18" y2="26" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Toe Pad 3 (Middle-Right): with note 3 -->
    <g transform="translate(296, 92) rotate(8)">
      <ellipse cx="0" cy="0" rx="38" ry="50" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="12" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="36" fill="#ffffff" text-anchor="middle">3</text>
      <!-- High tone dot -->
      <circle cx="0" cy="-26" r="4.5" fill="#f59e0b" />
      <!-- Under-beam -->
      <line x1="-18" y1="26" x2="18" y2="26" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Toe Pad 4 (Rightmost): with note 5 -->
    <g transform="translate(370, 135) rotate(24)">
      <ellipse cx="0" cy="0" rx="36" ry="46" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="11" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#fbbf24" text-anchor="middle">5</text>
      <!-- Low tone dot -->
      <circle cx="0" cy="30" r="4.5" fill="#fbbf24" />
      <!-- Under-beam -->
      <line x1="-16" y1="20" x2="16" y2="20" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Main Palm Pad (Center Heart/Paw Shape) -->
    <g>
      <!-- Outer Paw Palm Path -->
      <path d="M 256 185
               C 310 185, 365 210, 365 270
               C 365 320, 315 355, 256 355
               C 197 355, 147 320, 147 270
               C 147 210, 202 185, 256 185 Z"
            fill="url(#padGrad)"
            stroke="url(#goldGrad)"
            stroke-width="5" />

      <!-- Inner Glowing Musical Staff & Beams in Palm -->
      <g filter="url(#glow)">
        <!-- Musical notes icon inside the palm: Eighth notes pair + numbered notation -->
        <!-- Eighth note 1 -->
        <ellipse cx="220" cy="290" rx="18" ry="13" transform="rotate(-20 220 290)" fill="#fbbf24" />
        <rect x="232" y="222" width="6" height="66" rx="3" fill="#fbbf24" />
        
        <!-- Eighth note 2 -->
        <ellipse cx="288" cy="276" rx="18" ry="13" transform="rotate(-20 288 276)" fill="#ffffff" />
        <rect x="300" y="208" width="6" height="66" rx="3" fill="#ffffff" />
        
        <!-- Connecting Beam -->
        <polygon points="232,222 306,208 306,220 232,234" fill="url(#goldGrad)" />
        <polygon points="232,240 306,226 306,234 232,248" fill="url(#goldGrad)" />

        <!-- Floating tone sparkles -->
        <circle cx="184" cy="242" r="5" fill="#f59e0b" />
        <circle cx="328" cy="248" r="4.5" fill="#fbbf24" />
      </g>
    </g>
  </g>

  <!-- Bottom Labels -->
  <text x="256" y="420" font-family="'Noto Sans TC', 'PingFang TC', system-ui, sans-serif" font-weight="900" font-size="34" fill="#f4f4f5" text-anchor="middle" letter-spacing="4">台語簡譜</text>
  <text x="256" y="450" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#fbbf24" text-anchor="middle" letter-spacing="4">TAIGI COMPOSER</text>
  <text x="256" y="475" font-family="system-ui, sans-serif" font-weight="600" font-size="13" fill="#71717a" text-anchor="middle" letter-spacing="2">MUSIC &amp; KARAOKE STUDIO</text>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="50%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="40%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="padGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Safe area full background -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Centered paw within safe zone (center 400x400) -->
  <g id="paw-maskable" transform="translate(0, 15)" filter="url(#shadow)">
    <!-- Toe 1 -->
    <g transform="translate(155, 130) rotate(-24) scale(0.9)">
      <ellipse cx="0" cy="0" rx="36" ry="46" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="11" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#fbbf24" text-anchor="middle">1</text>
      <circle cx="0" cy="-24" r="4.5" fill="#fbbf24" />
      <line x1="-16" y1="24" x2="16" y2="24" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Toe 2 -->
    <g transform="translate(220, 92) rotate(-8) scale(0.9)">
      <ellipse cx="0" cy="0" rx="38" ry="50" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="12" font-family="system-ui, sans-serif" font-weight="900" font-size="36" fill="#ffffff" text-anchor="middle">2</text>
      <circle cx="0" cy="-26" r="4.5" fill="#f59e0b" />
      <line x1="-18" y1="26" x2="18" y2="26" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Toe 3 -->
    <g transform="translate(292, 92) rotate(8) scale(0.9)">
      <ellipse cx="0" cy="0" rx="38" ry="50" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="12" font-family="system-ui, sans-serif" font-weight="900" font-size="36" fill="#ffffff" text-anchor="middle">3</text>
      <circle cx="0" cy="-26" r="4.5" fill="#f59e0b" />
      <line x1="-18" y1="26" x2="18" y2="26" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Toe 4 -->
    <g transform="translate(357, 130) rotate(24) scale(0.9)">
      <ellipse cx="0" cy="0" rx="36" ry="46" fill="url(#padGrad)" stroke="url(#goldGrad)" stroke-width="4.5" />
      <text x="0" y="11" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#fbbf24" text-anchor="middle">5</text>
      <circle cx="0" cy="30" r="4.5" fill="#fbbf24" />
      <line x1="-16" y1="20" x2="16" y2="20" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Palm -->
    <g transform="scale(0.92) translate(22, 10)">
      <path d="M 256 185
               C 310 185, 365 210, 365 270
               C 365 320, 315 355, 256 355
               C 197 355, 147 320, 147 270
               C 147 210, 202 185, 256 185 Z"
            fill="url(#padGrad)"
            stroke="url(#goldGrad)"
            stroke-width="5" />

      <g filter="url(#glow)">
        <ellipse cx="220" cy="290" rx="18" ry="13" transform="rotate(-20 220 290)" fill="#fbbf24" />
        <rect x="232" y="222" width="6" height="66" rx="3" fill="#fbbf24" />
        
        <ellipse cx="288" cy="276" rx="18" ry="13" transform="rotate(-20 288 276)" fill="#ffffff" />
        <rect x="300" y="208" width="6" height="66" rx="3" fill="#ffffff" />
        
        <polygon points="232,222 306,208 306,220 232,234" fill="url(#goldGrad)" />
        <polygon points="232,240 306,226 306,234 232,248" fill="url(#goldGrad)" />
      </g>
    </g>
  </g>

  <text x="256" y="426" font-family="'Noto Sans TC', 'PingFang TC', system-ui, sans-serif" font-weight="900" font-size="30" fill="#f4f4f5" text-anchor="middle" letter-spacing="3">台語簡譜</text>
</svg>`;

async function generateIcons() {
  const publicDir = path.join(process.cwd(), 'public');
  const iconsDir = path.join(publicDir, 'icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. Write SVGs
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), iconSvg, 'utf8');
  fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), iconSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconSvg, 'utf8');
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), maskableSvg, 'utf8');

  // 2. Generate PNGs
  const svgBuffer = Buffer.from(iconSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  // icon-192x192.png
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192.png'));
  
  // icon-512x512.png
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512.png'));

  // apple-touch-icon.png (180x180)
  const apple180Buffer = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), apple180Buffer);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple180Buffer);

  // icon-maskable-192x192.png
  await sharp(maskableBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));

  // icon-maskable-512x512.png
  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  // favicon.ico (containing 16x16, 32x32, 48x48 PNG frames in standard ICO container)
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  const icoBuffer = createIco([
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 },
    { size: 48, buffer: png48 }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  console.log('All icons generated successfully!');
}

function createIco(images) {
  // ICO Header: 6 bytes
  // 0-1: Reserved (0)
  // 2-3: Type (1 for ICO)
  // 4-5: Count of images
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  // Each directory entry: 16 bytes
  const dirSize = 16 * images.length;
  let offset = 6 + dirSize;

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color palette (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image data size in bytes
    entry.writeUInt32LE(offset, 12); // image data offset
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(img => img.buffer)]);
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
