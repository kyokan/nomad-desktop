import fs from 'fs';

export async function dirExists(dir: string): Promise<boolean> {
  try {
    await fs.promises.access(dir, fs.constants.F_OK);
  } catch (e) {
    return false;
  }
  return true;
}