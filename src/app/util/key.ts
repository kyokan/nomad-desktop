const ECKey = require('eckey');
const secureRandom = require('secure-random');
import CryptoJS from 'crypto-js';

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
