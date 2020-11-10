// eslint-disable-next-line @typescript-eslint/no-var-requires
import secp256k1 from "secp256k1";

const ECKey = require('eckey');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const secureRandom = require('secure-random');
// eslint-disable-next-line @typescript-eslint/no-var-requires
import CryptoJS from 'crypto-js';
// @ts-ignore
import blake2b from 'blake2b';
import logger from "./logger";
import bcrypt from "bcrypt";



export function generateNewCompressedKey(): typeof ECKey {
  const bytes = secureRandom(32); //https://github.com/jprichardson/secure-random
  const compressedKey = new ECKey(bytes, true);
  return compressedKey;
}

export function encrypt(text: string, password: string): string {
  return CryptoJS.AES.encrypt(text, password).toString();
}

export function decrypt(ciphertext: string, password: string): string {
  const bytes  = CryptoJS.AES.decrypt(ciphertext, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function createSessionKey(username: string, ttl: number): Promise<string> {
  const bytes = secureRandom(32);
  const sessionkey = Buffer.from(bytes).toString('hex');
  return sessionkey;
}

export function hashString(text: string): string {
  const h = blake2b(32);
  h.update(Buffer.from(text, 'utf-8'));
  const hash = Buffer.from(h.digest());
  return hash.toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return reject(err);
      resolve(new Buffer(hash).toString('hex'));
    })
  });
}
