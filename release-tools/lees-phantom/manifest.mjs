import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const [root, version, revision] = process.argv.slice(2);
const config = JSON.parse(readFileSync(new URL('./public-config.json', import.meta.url)));
const key = createPrivateKey(process.env.PHANTOM_RELEASE_PRIVATE_KEY);
if (createPublicKey(key).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') !== config.releasePublicKey) {
  throw new Error('Release signing key mismatch');
}

const row = JSON.parse(readFileSync(join(root, 'darwin-aarch64.json'), 'utf8'));
if (row.version !== version || row.sourceRevision !== revision || row.target !== 'darwin-aarch64') {
  throw new Error('Platform/source mismatch');
}
const { bundleId, minOs, binarySha256, signerCertificateSha256, artifact } = row;
const platforms = {
  'darwin-aarch64': { bundleId, minOs, binarySha256, signerCertificateSha256, artifact },
};

const notesUrl = new URL(`./notes-${version}.md`, import.meta.url);
let notes = process.env.RELEASE_NOTES;
if (!notes) {
  if (!existsSync(notesUrl)) throw new Error(`Missing release notes file notes-${version}.md`);
  notes = readFileSync(notesUrl, 'utf8');
}

const payload = {
  schemaVersion: 1,
  product: 'lees-phantom',
  channel: 'stable',
  releaseId: `lees-phantom-v${version}`,
  version,
  sourceRevision: revision,
  publishedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  notes: notes.trim(),
  platforms,
};

const bytes = Buffer.from(JSON.stringify(payload));
const signature = sign(null, bytes, key);
if (!verify(null, bytes, createPublicKey(key), signature)) {
  throw new Error('Release signature verification failed');
}

writeFileSync(
  join(root, 'release-manifest.json'),
  JSON.stringify(
    {
      keyId: config.keyId,
      payloadBase64: bytes.toString('base64'),
      signatureBase64: signature.toString('base64'),
    },
    null,
    2
  ) + '\n',
  { flag: 'wx' }
);
