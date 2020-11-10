export type RestServerResponse = {
  payload: any;
  error?: boolean;
  meta?: boolean;
}

export const makeResponse = (payload: any, error?: boolean, meta?: any): RestServerResponse => {
  return {
    payload,
    error,
    meta,
  };
};
