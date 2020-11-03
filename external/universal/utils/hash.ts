// @ts-ignore
import blake2b from 'blake2b';
export function hash (name: string, guid: string): string {
  const h = blake2b(32);
  h.update(Buffer.from(name, 'utf-8'));
  h.update(Buffer.from(guid, 'hex'));
  return Buffer.from(h.digest()).toString('hex');
}
