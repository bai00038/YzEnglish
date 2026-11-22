// Deliberately accepts no bucket argument: this command can only sync staging.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const target = 'oss://yz-english-site-staging/';
if (process.argv.length > 2) throw new Error('This staging-only command takes no arguments');
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('npm', ['run', 'build:staging']);
const index = fs.readFileSync('dist/index.html', 'utf8');
const scripts = [...index.matchAll(/src="(\/assets\/[^"?]+\.js)"/g)];
if (!scripts.length || !scripts.some(match => fs.readFileSync('dist' + match[1], 'utf8').includes('https://api-staging.learnyzenglish.com'))) throw new Error('Build does not target the staging API');
// Announcements are runtime editorial data: a rebuild must never reset them.
run('ossutil', ['sync', 'dist/', target, '--update', '--exclude', 'announcements.json', '--meta', 'Cache-Control:no-cache']);
const announcements = spawnSync('ossutil', ['stat', target + 'announcements.json'], { encoding: 'utf8' });
if (announcements.error) throw announcements.error;
if (announcements.status !== 0) {
  if (!/NoSuchKey/.test(announcements.stdout + announcements.stderr)) throw new Error('Cannot inspect staging announcements; refusing to overwrite');
  run('ossutil', ['cp', 'dist/announcements.json', target + 'announcements.json', '--meta', 'Content-Type:application/json#Cache-Control:no-cache']);
}
console.log('Staging sync complete:', target);
