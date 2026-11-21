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
run('ossutil', ['sync', 'dist/', target, '--update', '--meta', 'Cache-Control:no-cache']);
console.log('Staging sync complete:', target);
