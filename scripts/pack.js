const AdmZip = require('adm-zip');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const outputPath = path.join(__dirname, '../myjson-plugin.upx');

console.log('Creating plugin package...');

try {
  const zip = new AdmZip();

  // Add all files from dist directory
  zip.addLocalFolder(distDir);

  // Write the zip file
  zip.writeZip(outputPath);

  console.log(`✓ Plugin packaged successfully: ${outputPath}`);
} catch (error) {
  console.error('Error creating package:', error);
  process.exit(1);
}
