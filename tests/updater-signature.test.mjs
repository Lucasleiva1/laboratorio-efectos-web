import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import { verifyUpdater } from '../scripts/verify-updater.mjs';

function fixture() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const data = Buffer.from('installer test payload');
  const id = Buffer.from('12345678');
  const rawKey = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const encodedKey = Buffer.from(`untrusted comment: public key\n${Buffer.concat([Buffer.from('Ed'), id, rawKey]).toString('base64')}\n`).toString('base64');
  const primary = sign(null, createHash('blake2b512').update(data).digest(), privateKey);
  const comment = 'timestamp:1\tfile:installer.exe\tprehashed';
  const global = sign(null, Buffer.concat([primary, Buffer.from(comment)]), privateKey);
  const signature = Buffer.from(`untrusted comment: signature\n${Buffer.concat([Buffer.from('ED'), id, primary]).toString('base64')}\ntrusted comment: ${comment}\n${global.toString('base64')}\n`).toString('base64');
  return { data, encodedKey, signature };
}
describe('Firma del actualizador', () => {
  it('acepta el instalador firmado y rechaza una descarga modificada', () => {
    const f = fixture();
    expect(verifyUpdater(f.data, f.signature, f.encodedKey)).toBe(true);
    expect(() => verifyUpdater(Buffer.from('modified'), f.signature, f.encodedKey)).toThrow();
  });
  it('rechaza comentarios alterados y otra clave pública', () => {
    const f = fixture();
    const altered = Buffer.from(Buffer.from(f.signature, 'base64').toString().replace('timestamp:1', 'timestamp:2')).toString('base64');
    expect(() => verifyUpdater(f.data, altered, f.encodedKey)).toThrow();
    expect(() => verifyUpdater(f.data, f.signature, fixture().encodedKey)).toThrow();
  });
});
