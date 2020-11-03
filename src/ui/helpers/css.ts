type BemifyObject = {
  el: (element: string) => BemifyObject;
  mod: (modulus: string) => BemifyObject;
  toString: () => string;
}
export const bemify = (base: string): BemifyObject =>{
  return {
    el: (element: string): BemifyObject => bemify(`${base}__${element}`),
    mod: (modulus: string): BemifyObject => bemify(`${base}--${modulus}`),
    toString: (): string => base,
  }
};
