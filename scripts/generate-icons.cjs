#!/usr/bin/env node

/**
 * Icon generation script for PWA
 *
 * This script generates placeholder PNG icons from the SVG source.
 * For production use, you should use proper image processing tools like:
 * - sharp (npm install sharp)
 * - ImageMagick
 * - Inkscape
 *
 * Usage: node scripts/generate-icons.js
 *
 * Note: This is a placeholder script that creates simple canvas-based icons.
 * The actual PNG generation would require additional dependencies.
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const ICON_SIZES = [
  16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512
];

const MASKABLE_SIZES = [192, 512];

// Directory paths
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const SPLASH_DIR = path.join(PUBLIC_DIR, 'splash');

// Ensure directories exist
[ICONS_DIR, SPLASH_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Generate a simple SVG placeholder for each size
// This creates valid SVG files that can be used as placeholders
// until proper PNG icons are generated

function generatePlaceholderSVG(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const cubeSize = size - (padding * 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${maskable ? '#646cff' : 'transparent'}"/>
  <g transform="translate(${padding}, ${padding})">
    <svg viewBox="0 0 100 100" width="${cubeSize}" height="${cubeSize}">
      <defs>
        <linearGradient id="face1-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#646cff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4a4fa0;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="face2-${size}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#4a4fa0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3a3f80;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="face3-${size}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#7a7fff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#646cff;stop-opacity:1" />
        </linearGradient>
      </defs>
      <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="url(#face1-${size})" stroke="#333" stroke-width="2"/>
      <polygon points="50,10 90,30 50,50 10,30" fill="url(#face3-${size})" stroke="#333" stroke-width="2"/>
      <polygon points="90,30 90,70 50,90 50,50" fill="url(#face2-${size})" stroke="#333" stroke-width="2"/>
      <polygon points="10,30 50,50 50,90 10,70" fill="url(#face1-${size})" stroke="#333" stroke-width="2"/>
    </svg>
  </g>
</svg>`;
}

function generateSplashSVG(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#242424"/>
  <g transform="translate(${width/2 - 75}, ${height/2 - 75})">
    <svg viewBox="0 0 100 100" width="150" height="150">
      <defs>
        <linearGradient id="face1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#646cff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4a4fa0;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="face2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#4a4fa0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3a3f80;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="face3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#7a7fff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#646cff;stop-opacity:1" />
        </linearGradient>
      </defs>
      <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="url(#face1)" stroke="#333" stroke-width="2"/>
      <polygon points="50,10 90,30 50,50 10,30" fill="url(#face3)" stroke="#333" stroke-width="2"/>
      <polygon points="90,30 90,70 50,90 50,50" fill="url(#face2)" stroke="#333" stroke-width="2"/>
      <polygon points="10,30 50,50 50,90 10,70" fill="url(#face1)" stroke="#333" stroke-width="2"/>
    </svg>
  </g>
  <text x="${width/2}" y="${height/2 + 100}" text-anchor="middle" fill="#646cff" font-family="system-ui, sans-serif" font-size="24" font-weight="bold">isocubic</text>
</svg>`;
}

// Generate regular icons
console.log('Generating icon placeholders...');
ICON_SIZES.forEach(size => {
  const svg = generatePlaceholderSVG(size, false);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(ICONS_DIR, filename), svg);
  console.log(`  Created ${filename}`);
});

// Generate maskable icons
console.log('Generating maskable icon placeholders...');
MASKABLE_SIZES.forEach(size => {
  const svg = generatePlaceholderSVG(size, true);
  const filename = `icon-maskable-${size}x${size}.svg`;
  fs.writeFileSync(path.join(ICONS_DIR, filename), svg);
  console.log(`  Created ${filename}`);
});

// Generate splash screens
console.log('Generating splash screen placeholders...');
const SPLASH_SIZES = [
  [640, 1136],   // iPhone 5
  [750, 1334],   // iPhone 6/7/8
  [1242, 2208],  // iPhone 6/7/8 Plus
  [1125, 2436],  // iPhone X/XS
  [1170, 2532],  // iPhone 12/13
];

SPLASH_SIZES.forEach(([width, height]) => {
  const svg = generateSplashSVG(width, height);
  const filename = `splash-${width}x${height}.svg`;
  fs.writeFileSync(path.join(SPLASH_DIR, filename), svg);
  console.log(`  Created ${filename}`);
});

console.log('\nPlaceholder generation complete!');
console.log('\nTo generate actual PNG files, install and use one of these tools:');
console.log('  - sharp: npm install sharp');
console.log('  - Inkscape: inkscape --export-png=icon.png --export-width=192 icon.svg');
console.log('  - ImageMagick: convert -background none icon.svg -resize 192x192 icon.png');
