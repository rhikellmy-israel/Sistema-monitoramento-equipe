import { readFileSync, writeFileSync } from 'fs';

const file = 'src/pages/ImportPage.tsx';
const buf = readFileSync(file);

// Check if UTF-16 LE BOM
if (buf[0] === 0xFF && buf[1] === 0xFE) {
  console.log('File is UTF-16 LE, converting to UTF-8...');
  const content = buf.toString('utf16le');
  // Remove BOM if present
  const clean = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  writeFileSync(file, clean, 'utf8');
  console.log('Converted to UTF-8 successfully');
} else if (buf[0] === 0xFE && buf[1] === 0xFF) {
  console.log('File is UTF-16 BE');
} else {
  console.log('File appears to be UTF-8 already, bytes:', buf[0], buf[1]);
  // Try re-writing as explicit UTF-8
  const content = buf.toString('utf8');
  writeFileSync(file, content, 'utf8');
  console.log('Re-saved as UTF-8');
}
