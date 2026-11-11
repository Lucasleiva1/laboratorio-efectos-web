import { readFile } from 'node:fs/promises';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const decodeText = value => value.trim().startsWith('untrusted comment:')
  ? value.trim() : Buffer.from(value.trim(), 'base64').toString('utf8').trim();

export function verifyUpdater(data, signatureText, publicKeyText) {
  const pubLines = decodeText(publicKeyText).split(/\r?\n/);
  const lines = decodeText(signatureText).split(/\r?\n/);
  const pub = Buffer.from(pubLines[1] ?? '', 'base64');
  const sig = Buffer.from(lines[1] ?? '', 'base64');
  const global = Buffer.from(lines[3] ?? '', 'base64');
  if (pub.length !== 42 || sig.length !== 74 || global.length !== 64 || !lines[2]?.startsWith('trusted comment: '))
    throw Error('Formato de firma Minisign inválido.');
  if (!pub.subarray(2, 10).equals(sig.subarray(2, 10))) throw Error('La firma usa otra clave.');
  const algorithm = sig.subarray(0, 2).toString('ascii');
  if (!['ED', 'Ed'].includes(algorithm)) throw Error('Algoritmo de firma no admitido.');
  const key = createPublicKey({key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), pub.subarray(10)]), format:'der', type:'spki'});
  const payload = algorithm === 'ED' ? createHash('blake2b512').update(data).digest() : data;
  if (!verify(null, payload, key, sig.subarray(10))) throw Error('El instalador no coincide con su firma.');
  const commentPayload = Buffer.concat([sig.subarray(10), Buffer.from(lines[2].slice(17))]);
  if (!verify(null, commentPayload, key, global)) throw Error('El comentario firmado no es válido.');
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [installer, signature] = process.argv.slice(2);
  if (!installer || !signature) throw Error('Uso: node scripts/verify-updater.mjs instalador.exe instalador.exe.sig');
  const config = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8'));
  verifyUpdater(await readFile(installer), await readFile(signature, 'utf8'), config.plugins.updater.pubkey);
  console.log('Firma del instalador y comentario: válidos con la clave pública de Effect Lab.');
}
