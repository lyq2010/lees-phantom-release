// Signs final macOS public artifacts with Minisign and emits darwin-aarch64.json.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const [root, target, version, binary, ...names] = process.argv.slice(2);
const config = JSON.parse(readFileSync(new URL('./public-config.json', import.meta.url)));

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? '') || target !== 'darwin-aarch64') {
  throw new Error('Unsupported release target/version');
}
const expectedNames = [
  `lees-phantom-${version}-macos-aarch64.dmg`,
  `lees-phantom-${version}-macos-aarch64.app.tar.gz`,
].sort();
if (JSON.stringify([...names].sort()) !== JSON.stringify(expectedNames)) {
  throw new Error(`Artifact contract mismatch: expected ${expectedNames.join(', ')}`);
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const keyDir = mkdtempSync(join(tmpdir(), 'lees-phantom-signing-'));
try {
  const key = join(keyDir, 'updater.key');
  writeFileSync(key, process.env.PHANTOM_UPDATER_PRIVATE_KEY, { mode: 0o600, flag: 'wx' });
  const password = process.env.PHANTOM_UPDATER_PRIVATE_KEY_PASSWORD;
  if (!password) throw new Error('Missing updater password');

  const files = [];
  for (const name of names) {
    if (basename(name) !== name || !name.startsWith(`lees-phantom-${version}-`) || !/\.(dmg|app\.tar\.gz)$/.test(name)) {
      throw new Error('Unsafe public artifact');
    }
    const file = join(root, name);
    const bytes = readFileSync(file);
    if (!bytes.length || bytes.length > 512 * 1024 * 1024) {
      throw new Error('Artifact size exceeds budget');
    }
    const signature = `${file}.minisig`;
    for (const args of [
      ['-S', '-s', key, '-m', file, '-x', signature],
      ['-V', '-P', config.updaterPublicKey, '-m', file, '-x', signature],
    ]) {
      if (spawnSync('minisign', args, { input: password + '\n', encoding: 'utf8' }).status !== 0) {
        throw new Error('Artifact signing/verification failed');
      }
    }
    files.push({
      name,
      size: bytes.length,
      sha256: sha(bytes),
      signature: readFileSync(signature, 'utf8'),
    });
  }

  const artifact = files.find((f) => f.name.endsWith('.app.tar.gz'));
  if (!artifact) throw new Error('Updater artifact missing');

  const sourceRevision = process.env.PHANTOM_BUILD_SHA;
  if (!/^[a-f0-9]{40}$/.test(sourceRevision ?? '')) throw new Error('Source identity missing');

  const row = {
    target,
    version,
    sourceRevision,
    bundleId: 'com.lee.phantom',
    minOs: '14.0',
    binarySha256: sha(readFileSync(binary)),
    signerCertificateSha256: null,
    artifact: {
      path: `lees-phantom/releases/${version}/${artifact.name}`,
      size: artifact.size,
      sha256: artifact.sha256,
      signature: artifact.signature,
    },
    files,
  };
  writeFileSync(join(root, `${target}.json`), JSON.stringify(row, null, 2) + '\n', { flag: 'wx' });
  console.log(`Verified ${target}: ${files.length} final signed artifacts`);
} finally {
  rmSync(keyDir, { recursive: true, force: true });
}
