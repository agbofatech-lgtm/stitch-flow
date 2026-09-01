/**
 * SER-F2 visual lab: headless screenshot of the REAL product (index.html), not experience-preview.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '..', '..', 'docs', 'architecture', 'frontend', 'experience', 'lab');
mkdirSync(outDir, { recursive: true });

const browsers = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const browser = browsers.find((path) => existsSync(path));
if (!browser) {
  console.error('VISUAL_LAB_NO_BROWSER');
  process.exit(2);
}

const url = process.env.SER_F2_URL || 'http://127.0.0.1:5173/';
const shots = [
  { file: 'floor-1280.png', size: '1280,800' },
  { file: 'floor-390.png', size: '390,844' },
];

function shot(file, size) {
  return new Promise((resolve, reject) => {
    const out = join(outDir, file);
    const child = spawn(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        `--window-size=${size}`,
        '--hide-scrollbars',
        `--screenshot=${out}`,
        '--virtual-time-budget=5000',
        url,
      ],
      { stdio: 'inherit' }
    );
    child.on('exit', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`browser exit ${code}`));
    });
  });
}

for (const item of shots) {
  await shot(item.file, item.size);
  console.log('captured', item.file);
}
