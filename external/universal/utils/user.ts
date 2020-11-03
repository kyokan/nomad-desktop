export const RELAYER_TLDS: {[k: string]: string} = {
  "2062": "2062",
  "5404": "5404",
  "6371": "6371",
  "9411": "9411",
  "9764": "9764",
};

export const undotName = (name: string): string => {
  const len = name.length;

  if (name[len - 1] === '.') return name.slice(0, len - 1);
  return name;
};

export const dotName = (name: string): string => {
  return `${undotName(name)}`;
};

export const serializeUsername = (subdomain: string | null, tld: string): string => {
  if (!tld) {
    return '';
  }

  if (!subdomain) {
    return dotName(tld);
  }

  return `${subdomain}.${dotName(tld)}`;
};

export const parseUsername = (username: string): { tld: string; subdomain: string | null } => {
  const splits = undotName(username).split('.');

  if (splits.length === 1) {
    return {
      tld: splits[0],
      subdomain: null,
    };
  }

  if (splits.length === 2) {
    return {
      tld: splits[1],
      subdomain: splits[0],
    };
  }

  return {
    tld: '',
    subdomain: null,
  };
};

export const isTLD = (username: string): boolean => {
  const { tld, subdomain } = parseUsername(username);
  return !subdomain && !!tld;
};

export const isSubdomain = (username: string): boolean => {
  const { subdomain, tld } = parseUsername(username);

  return !!subdomain && !!tld;
};
