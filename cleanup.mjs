import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';

// 1. Fix ImportPage.tsx - remove scheduling code
const importFile = 'src/pages/ImportPage.tsx';
let content = readFileSync(importFile, 'utf16le');
// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// Remove scheduling payload block in handleSaveAndStart
content = content.replace(
  /\s*if \(importType === "scheduling"\) \{\s*return \{\s*import_id: importId,\s*data:.*?\n.*?tecnico:.*?\n.*?horario:.*?\n.*?status:.*?\n.*?observacao:.*?\n\s*\};\s*\}/s,
  ''
);

// Remove scheduling save/navigate block
content = content.replace(
  /\s*\} else if \(importType === "scheduling"\) \{\s*setSchedulingData\(\(prev: any\) => \[\.\.\.payload, \.\.\.\(Array\.isArray\(prev\) \? prev : \[\]\)\]\);\s*navigate\("\/maintenance"\);/s,
  ''
);

// Remove setSchedulingData from handleDeleteHistory
content = content.replace(
  /\s*setSchedulingData\(\(prev: any\) => prev\.filter\(\(r: any\) => r\.import_id !== id\)\);/g,
  ''
);

// Save as UTF-8
writeFileSync(importFile, content, 'utf8');
console.log('ImportPage.tsx: scheduling code removed and re-saved as UTF-8');

// 2. Delete ManutencaoDashboardPage.tsx
const maintDashboard = 'src/pages/ManutencaoDashboardPage.tsx';
if (existsSync(maintDashboard)) {
  unlinkSync(maintDashboard);
  console.log('ManutencaoDashboardPage.tsx: DELETED');
} else {
  console.log('ManutencaoDashboardPage.tsx: already deleted');
}

// 3. Delete this cleanup script
const fixEncoding = 'fix_encoding.mjs';
if (existsSync(fixEncoding)) {
  unlinkSync(fixEncoding);
  console.log('fix_encoding.mjs: DELETED');
}

console.log('\\nCleanup complete!');
