import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition, detail = '') => {
  checks.push({name, ok: Boolean(condition), detail});
  if (!condition) process.exitCode = 1;
};

const index = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('sw.js');
const scripts = [...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);

check('index.html exists', index.startsWith('<!DOCTYPE html>'));
check('Japanese language metadata', /<html[^>]+lang="ja"/.test(index));
check('iPhone viewport safe area', /viewport-fit=cover/.test(index));
check('Manifest link', /rel="manifest" href="\.\/manifest\.webmanifest"/.test(index));
check('Apple touch icon', /rel="apple-touch-icon"/.test(index));
check('Standalone iOS metadata', /apple-mobile-web-app-capable" content="yes"/.test(index));
check('Service worker registration', /serviceWorker\.register\('\.\/sw\.js'/.test(index));
check('Stable localStorage key', /STORE_KEY='asahi_learning_os_v1'/.test(index));
check('JSON export and import', /function exportJSON/.test(index) && /function importJSON/.test(index));
check('Update prompt', /SKIP_WAITING/.test(index) && /PWA\.waiting/.test(index));
check('No root-relative app-shell URLs', !/(?:src|href)="\/(?!\/)/.test(index));
check('One inline application script', scripts.length === 1, `found ${scripts.length}`);

try {
  new vm.Script(scripts[0], {filename: 'index-inline.js'});
  check('Application JavaScript syntax', true);
} catch (error) {
  check('Application JavaScript syntax', false, error.message);
}

try {
  new vm.Script(sw, {filename: 'sw.js'});
  check('Service worker syntax', true);
} catch (error) {
  check('Service worker syntax', false, error.message);
}

check('Manifest identity', manifest.id === './' && manifest.start_url === './' && manifest.scope === './');
check('Standalone display', manifest.display === 'standalone');
check('Manifest icons', Array.isArray(manifest.icons) && manifest.icons.length >= 3);
check('Maskable icon', manifest.icons.some(icon => icon.purpose === 'maskable'));

for (const icon of manifest.icons) {
  const iconPath = path.join(root, icon.src.replace(/^\.\//, ''));
  check(`Icon exists: ${icon.src}`, fs.existsSync(iconPath));
  if (!fs.existsSync(iconPath)) continue;
  const png = fs.readFileSync(iconPath);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const expected = Number(icon.sizes.split('x')[0]);
  check(`Icon size: ${icon.src}`, width === expected && height === expected, `${width}x${height}`);
}

check('Offline fallback included', fs.existsSync(path.join(root, 'offline.html')) && sw.includes('offline.html'));
check('Cache version matches app version', /APP_VERSION='1\.4\.0'/.test(index) && /VERSION = '1\.4\.0'/.test(sw));
check('README included', fs.existsSync(path.join(root, 'README.md')));

for (const result of checks) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
}
console.log(`\n${checks.filter(x => x.ok).length}/${checks.length} checks passed`);
