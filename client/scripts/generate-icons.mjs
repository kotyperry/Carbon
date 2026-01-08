import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'src-tauri', 'icons');
const publicDir = join(rootDir, 'public');

// Read the SVG file
const svgPath = join(publicDir, 'icon.svg');
const svgBuffer = readFileSync(svgPath);

// Icon sizes needed for Tauri
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  // Windows Store logos
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

// Generate PNG icons
async function generatePNGs() {
  console.log('Generating PNG icons...');
  
  for (const { name, size } of sizes) {
    const outputPath = join(iconsDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }
}

// Generate .icns for macOS using iconutil
async function generateICNS() {
  console.log('Generating macOS .icns...');
  
  const iconsetDir = join(iconsDir, 'icon.iconset');
  
  // Create iconset directory
  if (existsSync(iconsetDir)) {
    rmSync(iconsetDir, { recursive: true });
  }
  mkdirSync(iconsetDir, { recursive: true });
  
  // macOS iconset sizes
  const iconsetSizes = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_512x512@2x.png', size: 1024 },
  ];
  
  for (const { name, size } of iconsetSizes) {
    const outputPath = join(iconsetDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
  }
  
  // Use iconutil to create .icns
  const icnsPath = join(iconsDir, 'icon.icns');
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
  
  // Clean up iconset directory
  rmSync(iconsetDir, { recursive: true });
  
  console.log('  ✓ icon.icns');
}

// Generate .ico for Windows
async function generateICO() {
  console.log('Generating Windows .ico...');
  
  // ICO format needs multiple sizes embedded
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPath = join(iconsDir, 'icon.ico');
  
  // Generate all size buffers
  const buffers = await Promise.all(
    icoSizes.map(async (size) => {
      return await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
    })
  );
  
  // Create ICO file manually
  // ICO header: 6 bytes
  // ICO directory entry: 16 bytes per image
  // Image data follows
  
  const numImages = buffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  
  // Calculate offsets
  let offset = headerSize + dirSize;
  const offsets = buffers.map((buf) => {
    const currentOffset = offset;
    offset += buf.length;
    return currentOffset;
  });
  
  // Total file size
  const totalSize = offset;
  const icoBuffer = Buffer.alloc(totalSize);
  
  // Write ICO header
  icoBuffer.writeUInt16LE(0, 0);      // Reserved
  icoBuffer.writeUInt16LE(1, 2);      // Type: 1 = ICO
  icoBuffer.writeUInt16LE(numImages, 4); // Number of images
  
  // Write directory entries
  for (let i = 0; i < numImages; i++) {
    const size = icoSizes[i];
    const entryOffset = headerSize + (i * dirEntrySize);
    
    icoBuffer.writeUInt8(size >= 256 ? 0 : size, entryOffset);     // Width
    icoBuffer.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1); // Height
    icoBuffer.writeUInt8(0, entryOffset + 2);                       // Color palette
    icoBuffer.writeUInt8(0, entryOffset + 3);                       // Reserved
    icoBuffer.writeUInt16LE(1, entryOffset + 4);                    // Color planes
    icoBuffer.writeUInt16LE(32, entryOffset + 6);                   // Bits per pixel
    icoBuffer.writeUInt32LE(buffers[i].length, entryOffset + 8);   // Image size
    icoBuffer.writeUInt32LE(offsets[i], entryOffset + 12);         // Image offset
  }
  
  // Write image data
  for (let i = 0; i < numImages; i++) {
    buffers[i].copy(icoBuffer, offsets[i]);
  }
  
  writeFileSync(icoPath, icoBuffer);
  console.log('  ✓ icon.ico');
}

async function main() {
  console.log('🎨 Generating Carbon icons for Tauri...\n');
  
  await generatePNGs();
  await generateICNS();
  await generateICO();
  
  console.log('\n✅ All icons generated successfully!');
}

main().catch(console.error);
