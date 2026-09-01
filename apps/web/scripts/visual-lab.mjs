/**
 * SER visual lab: REAL product index.html, never experience-preview.html.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
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

function shot(file, size, extra = []) {
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
        '--virtual-time-budget=6000',
        ...extra,
        url,
      ],
      { stdio: 'inherit', cwd: outDir }
    );
    child.on('exit', (code) => {
      const fallback = join(outDir, 'screenshot.png');
      if (existsSync(fallback) && !existsSync(out)) {
        renameSync(fallback, out);
      }
      if (code === 0 || existsSync(out)) resolve(out);
      else reject(new Error(`browser exit ${code} missing ${file}`));
    });
  });
}

await shot('floor-1280.png', '1280,800');
console.log('captured floor-1280.png');
try {
  await shot('floor-390.png', '390,844');
  console.log('captured floor-390.png');
} catch (err) {
  console.warn('390 failed', err instanceof Error ? err.message : err);
}
try {
  await shot('floor-1280-reduced.png', '1280,800', ['--force-prefers-reduced-motion']);
  console.log('captured floor-1280-reduced.png');
} catch (err) {
  console.warn('reduced-motion shot failed', err instanceof Error ? err.message : err);
}
