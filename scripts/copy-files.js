const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const fontsDir = path.join(__dirname, '../dist/fonts');

// Ensure fonts directory exists
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Copy files
const filesToCopy = [
  { src: 'plugin.json', dest: 'dist/plugin.json' },
  { src: 'preload.js', dest: 'dist/preload.js' },
  { src: 'logo.png', dest: 'dist/logo.png' },
];

filesToCopy.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, '..', src);
  const destPath = path.join(__dirname, '..', dest);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${src} to ${dest}`);
});

// Copy fonts directory
const srcFontsDir = path.join(__dirname, '../public/fonts');
if (fs.existsSync(srcFontsDir)) {
  const fontFiles = fs.readdirSync(srcFontsDir);
  fontFiles.forEach(file => {
    fs.copyFileSync(
      path.join(srcFontsDir, file),
      path.join(fontsDir, file)
    );
  });
  console.log(`Copied fonts directory`);
}

console.log('All files copied successfully!');
