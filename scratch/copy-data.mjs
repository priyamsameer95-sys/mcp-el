import fs from 'fs';

const srcDir = './src/data';
const destDir = './dist/data';

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Successfully copied src/data to dist/data');
} catch (err) {
  console.error('Failed to copy data folder:', err);
  process.exit(1);
}
