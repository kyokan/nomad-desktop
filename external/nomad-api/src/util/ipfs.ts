import {makeResponse} from "./rest";

const IPFS = require('ipfs');

let node: any | null = null;

export async function getNode(): Promise<any> {
  if (!node) {
    node = await IPFS.create();
  }
  return node;
}

export async function addFileToIPFS(filename: string, content: Buffer): Promise<string> {
  const ipfs = await getNode();
  const filesAdded = await ipfs.add({
    path: filename,
    content,
    progress: true,
  });

  for await (const fileAdded  of filesAdded) {
    return fileAdded.cid.toString();
  }

  return '';
}
