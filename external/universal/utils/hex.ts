const IS_HEX_REGEX = /^[0-9A-F]{64}$/i;
export function isHex (text= ''): boolean {
  const adj = text.replace('\n', '');
  return IS_HEX_REGEX.test(adj);
}
