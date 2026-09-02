/**
 * SER visual lab: REAL product `/` only. Never experience-preview.html.
 * Uses CDP so later shots cannot overwrite earlier files (Edge `--screenshot=`
 * historically wrote screenshot.png and skipped existing named paths).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
const port = Number(process.env.SER_LAB_CDP_PORT || 9333);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitJson(endpoint, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return await response.json();
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error(`CDP not ready at ${endpoint}`);
}

function openWs(socketUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(socketUrl);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', (error) => reject(error));
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = (this.nextId += 1);
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || expression);
  }
  return result?.result?.value;
}

async function waitForPlace(cdp, placeId, tries = 80) {
  for (let i = 0; i < tries; i += 1) {
    const found = await evaluate(cdp, `document.querySelector('[data-atelier-place="${placeId}"]') !== null`);
    if (found) return;
    await sleep(250);
  }
  throw new Error(`place ${placeId} not visible`);
}

async function waitForWorkroom(cdp, place, tries = 120) {
  for (let i = 0; i < tries; i += 1) {
    const found = await evaluate(cdp, `document.querySelector('[data-workroom=${JSON.stringify(place)}]') !== null`);
    if (found) {
      await sleep(500);
      return;
    }
    await sleep(250);
  }
  throw new Error(`workroom ${place} not visible`);
}

async function clickText(cdp, text) {
  await evaluate(
    cdp,
    `(() => {
      const needle = ${JSON.stringify(text)};
      const nodes = [...document.querySelectorAll('button, [role="button"]')];
      const el = nodes.find((node) => (node.textContent || '').replace(/\\s+/g, ' ').includes(needle));
      if (!el) throw new Error('missing ' + needle);
      el.click();
      return true;
    })()`
  );
}

async function clickNav(cdp, text) {
  await evaluate(
    cdp,
    `(() => {
      const needle = ${JSON.stringify(text)};
      const aside = document.querySelector('aside[aria-label="Atelier navigation"]');
      const nodes = [...(aside || document).querySelectorAll('button')];
      const exact = nodes.find((node) => (node.textContent || '').replace(/\\s+/g, ' ').trim() === needle);
      const el = exact || nodes.find((node) => (node.textContent || '').includes(needle));
      if (!el) throw new Error('missing nav ' + needle);
      el.click();
      return true;
    })()`
  );
}

async function pressEscape(cdp) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
}

async function clickAria(cdp, label) {
  await evaluate(
    cdp,
    `(() => {
      const el = document.querySelector('[aria-label=${JSON.stringify(label)}]');
      if (!el) throw new Error('missing aria ' + ${JSON.stringify(label)});
      el.click();
      return true;
    })()`
  );
}

async function clickControlSection(cdp, section) {
  await evaluate(
    cdp,
    `(() => {
      const el = document.querySelector('[data-control-section=${JSON.stringify(section)}]');
      if (!el) throw new Error('missing control section ' + ${JSON.stringify(section)});
      el.click();
      return true;
    })()`
  );
}

async function setViewport(cdp, width, height, mobile) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: Boolean(mobile),
  });
}

async function setReducedMotion(cdp, reduce) {
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }],
  });
}

const F11_ALIASES = {
  'floor-1280.png': 'f11-floor-1280.png',
  'floor-768.png': 'f11-floor-768.png',
  'floor-390.png': 'f11-floor-390.png',
  'clients-1280.png': 'f11-clients-1280.png',
  'clients-768.png': 'f11-clients-768.png',
  'clients-390.png': 'f11-clients-390.png',
  'measurements-1280.png': 'f11-measurements-1280.png',
  'measurements-768.png': 'f11-measurements-768.png',
  'measurements-390.png': 'f11-measurements-390.png',
  'design-1280.png': 'f11-design-1280.png',
  'design-768.png': 'f11-design-768.png',
  'design-390.png': 'f11-design-390.png',
  'production-1280.png': 'f11-production-1280.png',
  'production-768.png': 'f11-production-768.png',
  'production-390.png': 'f11-production-390.png',
  'ledger-1280.png': 'f11-ledger-1280.png',
  'ledger-768.png': 'f11-ledger-768.png',
  'ledger-390.png': 'f11-ledger-390.png',
  'control-1280.png': 'f11-control-1280.png',
  'control-768.png': 'f11-control-768.png',
  'control-390.png': 'f11-control-390.png',
  'command-1280.png': 'f11-command-1280.png',
  'command-390.png': 'f11-command-390.png',
  'floor-390-nav.png': 'f11-drawer-390.png',
};

async function auditViewport(cdp, label) {
  const report = await evaluate(
    cdp,
    `(() => {
      const doc = document.documentElement;
      const h1 = document.querySelector('header h1');
      return {
        overflowX: doc.scrollWidth > doc.clientWidth + 2,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        title: h1 ? (h1.textContent || '').trim() : '',
        titleClipped: h1 ? h1.scrollWidth > h1.clientWidth + 2 : false,
      };
    })()`
  );
  console.log('audit', label, JSON.stringify(report));
  return report;
}

async function capture(cdp, file) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const buf = Buffer.from(shot.data, 'base64');
  writeFileSync(join(outDir, file), buf);
  console.log('captured', file);
  const alias = F11_ALIASES[file];
  if (alias) {
    writeFileSync(join(outDir, alias), buf);
    console.log('captured', alias);
  }
  await auditViewport(cdp, alias || file);
}

async function goFloor(cdp) {
  await setViewport(cdp, 1280, 800, false);
  await sleep(400);
  await pressEscape(cdp);
  await sleep(200);
  try {
    await clickNav(cdp, 'Floor');
  } catch {
    try {
      await clickAria(cdp, 'Open navigation');
      await sleep(300);
      await clickNav(cdp, 'Floor');
    } catch {
      /* reload below */
    }
  }
  for (let i = 0; i < 16; i += 1) {
    const found = await evaluate(cdp, `document.querySelector('[data-workroom="Floor"]') !== null`);
    if (found) {
      await sleep(300);
      return;
    }
    await sleep(250);
  }
  await cdp.send('Page.navigate', { url });
  await sleep(4000);
  await waitForPlace(cdp, 'command');
  await waitForWorkroom(cdp, 'Floor');
}

const profile = mkdtempSync(join(tmpdir(), 'sf-ser-lab-'));
const child = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=1280,800`,
    url,
  ],
  { stdio: 'ignore' }
);

let exitCode = 0;
try {
  let pageTarget = null;
  for (let i = 0; i < 40; i += 1) {
    const list = await waitJson(`http://127.0.0.1:${port}/json/list`);
    pageTarget = (Array.isArray(list) ? list : []).find(
      (target) => target.type === 'page' && target.webSocketDebuggerUrl && !String(target.url || '').startsWith('devtools://')
    );
    if (pageTarget) break;
    await sleep(250);
  }
  if (!pageTarget) throw new Error('no page target');
  const ws = await openWs(pageTarget.webSocketDebuggerUrl);
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url });
  await sleep(4000);
  await waitForPlace(cdp, 'command');
  await waitForWorkroom(cdp, 'Floor');

  await setViewport(cdp, 1280, 800, false);
  await sleep(400);
  await capture(cdp, 'floor-1280.png');

  await setReducedMotion(cdp, true);
  await sleep(200);
  await capture(cdp, 'floor-1280-reduced.png');
  await setReducedMotion(cdp, false);

  const matrix = [
    { nav: 'Floor', place: 'command', workroom: 'Floor', files: { 768: 'floor-768.png', 390: 'floor-390.png' } },
    {
      nav: 'Control Center',
      place: 'control',
      workroom: 'Control Center',
      files: { 1280: 'control-1280.png', 768: 'control-768.png', 390: 'control-390.png' },
    },
    {
      nav: 'Client room',
      place: 'clients',
      workroom: 'Client room',
      files: { 1280: 'clients-1280.png', 768: 'clients-768.png', 390: 'clients-390.png' },
    },
    {
      nav: 'Measurement table',
      place: 'measurements',
      workroom: 'Measurement table',
      files: { 1280: 'measurements-1280.png', 768: 'measurements-768.png', 390: 'measurements-390.png' },
    },
    {
      nav: 'Design table',
      place: 'design',
      workroom: 'Design table',
      files: { 1280: 'design-1280.png', 768: 'design-768.png', 390: 'design-390.png' },
    },
    {
      nav: 'Production floor',
      place: 'production',
      workroom: 'Production floor',
      files: { 1280: 'production-1280.png', 768: 'production-768.png', 390: 'production-390.png' },
    },
    {
      nav: 'Orders',
      place: 'business',
      workroom: 'Ledger',
      files: { 1280: 'ledger-1280.png', 768: 'ledger-768.png', 390: 'ledger-390.png' },
    },
  ];

  async function visitRoom(room) {
    await setViewport(cdp, 1280, 800, false);
    await sleep(300);
    if (!room.nav) return;
    await clickNav(cdp, room.nav);
    await sleep(800);
    await waitForPlace(cdp, room.place);
    await waitForWorkroom(cdp, room.workroom);
    await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
    await sleep(200);
  }

  async function captureSweep(width, height, mobile, key) {
    for (const room of matrix) {
      try {
        await visitRoom(room);
        await setViewport(cdp, width, height, Boolean(mobile));
        await sleep(400);
        await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
        await sleep(200);
        await capture(cdp, room.files[key]);
      } catch (error) {
        console.error(
          'VISUAL_LAB_ROOM',
          room.workroom,
          key,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  for (const room of matrix) {
    try {
      await visitRoom(room);
      if (room.files[1280]) await capture(cdp, room.files[1280]);
    } catch (error) {
      console.error(
        'VISUAL_LAB_ROOM',
        room.workroom,
        1280,
        error instanceof Error ? error.message : error
      );
    }
  }
  await captureSweep(768, 800, false, 768);
  await captureSweep(390, 844, true, 390);
  await setViewport(cdp, 1280, 800, false);
  await sleep(400);

  try {
  await clickNav(cdp, 'Control Center');
  await waitForPlace(cdp, 'control');
  await waitForWorkroom(cdp, 'Control Center');
  await sleep(600);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'control-1280.png');
  await setViewport(cdp, 768, 800, false);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'control-768.png');
  await setViewport(cdp, 390, 844, true);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'control-390.png');
  await setViewport(cdp, 1280, 800, false);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await clickControlSection(cdp, 'system');
  await sleep(400);
  await capture(cdp, 'control-system-1280.png');
  await clickControlSection(cdp, 'operations');
  await sleep(400);
  await capture(cdp, 'control-operations-1280.png');
  await clickControlSection(cdp, 'platform');
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'control-platform-1280.png');
  await goFloor(cdp);

  await clickNav(cdp, 'Production floor');
  await waitForPlace(cdp, 'production');
  await waitForWorkroom(cdp, 'Production floor');
  await sleep(600);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'production-1280.png');
  await clickText(cdp, 'ORD-2024-001');
  await sleep(600);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'production-active-1280.png');
  await clickText(cdp, 'Open ledger');
  await waitForPlace(cdp, 'business');
  await waitForWorkroom(cdp, 'Ledger');
  await sleep(600);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'ledger-1280.png');
  await setViewport(cdp, 768, 800, false);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'ledger-768.png');
  await setViewport(cdp, 390, 844, true);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'ledger-390.png');
  await goFloor(cdp);
  await clickNav(cdp, 'Production floor');
  await waitForPlace(cdp, 'production');
  await waitForWorkroom(cdp, 'Production floor');
  await sleep(400);
  await setViewport(cdp, 768, 800, false);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'production-768.png');
  await setViewport(cdp, 390, 844, true);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'production-390.png');
  await goFloor(cdp);

  await clickNav(cdp, 'Client room');
  await waitForPlace(cdp, 'clients');
  await waitForWorkroom(cdp, 'Client room');
  await sleep(400);
  await capture(cdp, 'clients-1280.png');

  await clickText(cdp, 'Emma Thompson');
  await sleep(800);
  await capture(cdp, 'clients-dossier-1280.png');

  await clickText(cdp, 'Continue to measurements');
  await waitForPlace(cdp, 'measurements');
  await waitForWorkroom(cdp, 'Measurement table');
  await sleep(400);
  await capture(cdp, 'measurements-1280.png');

  await clickText(cdp, 'Begin a live profile');
  await sleep(1000);
  await evaluate(cdp, `document.querySelector('[data-measurement-canvas]')?.scrollIntoView({ block: 'start' })`);
  await sleep(200);
  await capture(cdp, 'measurements-capture-1280.png');

  await clickNav(cdp, 'Design table');
  await waitForPlace(cdp, 'design');
  await waitForWorkroom(cdp, 'Design table');
  await sleep(1200);
  await evaluate(
    cdp,
    `document.querySelector('#workspace-main')?.scrollTo(0,0); document.querySelector('[data-workroom="Design table"]')?.scrollIntoView({ block: 'start' });`
  );
  await sleep(200);
  await capture(cdp, 'design-1280.png');
  await setViewport(cdp, 768, 800, false);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'design-768.png');
  await setViewport(cdp, 390, 844, true);
  await sleep(400);
  await evaluate(cdp, `document.querySelector('#workspace-main')?.scrollTo(0,0)`);
  await sleep(200);
  await capture(cdp, 'design-390.png');
  await goFloor(cdp);
  await clickAria(cdp, 'Search workspaces');
  await sleep(500);
  await capture(cdp, 'command-1280.png');
  await pressEscape(cdp);
  await sleep(300);

  await setViewport(cdp, 768, 800, false);
  await sleep(400);
  await clickAria(cdp, 'Open navigation');
  await sleep(300);
  await clickNav(cdp, 'Floor');
  await waitForPlace(cdp, 'command');
  await waitForWorkroom(cdp, 'Floor');
  await sleep(300);
  await capture(cdp, 'floor-768.png');
  await clickAria(cdp, 'Open navigation');
  await sleep(300);
  await clickNav(cdp, 'Client room');
  await waitForPlace(cdp, 'clients');
  await waitForWorkroom(cdp, 'Client room');
  await sleep(400);
  await capture(cdp, 'clients-768.png');
  await clickAria(cdp, 'Open navigation');
  await sleep(300);
  await clickNav(cdp, 'Measurement table');
  await waitForPlace(cdp, 'measurements');
  await waitForWorkroom(cdp, 'Measurement table');
  await sleep(400);
  await capture(cdp, 'measurements-768.png');
  await clickAria(cdp, 'Open navigation');
  await sleep(300);
  await clickNav(cdp, 'Floor');
  await waitForPlace(cdp, 'command');
  await waitForWorkroom(cdp, 'Floor');
  await sleep(300);

  await setViewport(cdp, 390, 844, true);
  await sleep(500);
  await capture(cdp, 'floor-390.png');
  await clickAria(cdp, 'Search workspaces');
  await sleep(400);
  await capture(cdp, 'command-390.png');
  await pressEscape(cdp);
  await sleep(300);
  await clickAria(cdp, 'Open navigation');
  await sleep(400);
  await capture(cdp, 'floor-390-nav.png');
  await clickNav(cdp, 'Client room');
  await waitForPlace(cdp, 'clients');
  await waitForWorkroom(cdp, 'Client room');
  await pressEscape(cdp);
  await sleep(500);
  await capture(cdp, 'clients-390.png');
  await clickAria(cdp, 'Open navigation');
  await sleep(400);
  await clickNav(cdp, 'Measurement table');
  await waitForPlace(cdp, 'measurements');
  await waitForWorkroom(cdp, 'Measurement table');
  await pressEscape(cdp);
  await sleep(500);
  await capture(cdp, 'measurements-390.png');
  } catch (error) {
    console.error('VISUAL_LAB_JOURNEY', error instanceof Error ? error.message : error);
  }

  ws.close();
} catch (error) {
  exitCode = 1;
  console.error('VISUAL_LAB_FAILED', error instanceof Error ? error.message : error);
} finally {
  child.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

process.exit(exitCode);
