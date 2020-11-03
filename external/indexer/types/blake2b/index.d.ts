declare module 'blake2b' {
  interface Blake2Hasher {
    update (buf: Buffer): void
    digest (): Uint8Array
  }

  const blk2: (outLen: number) => Blake2Hasher;

  export = blk2;
}