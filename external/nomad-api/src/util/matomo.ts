// eslint-disable-next-line @typescript-eslint/no-var-requires
import {Request} from "express";

// const Matomo = require("matomo-tracker");
// import config from "../../config.json";
// const matomo = config.matomoAPI && new Matomo(3, config.matomoAPI);

export function trackAttempt(namespace: string, req: Request, name?: string, v?: string) {
  // try {
  //   if (!matomo) return;
  //   matomo.track({
  //     url: `http://${config.baseIP || 'localhost'}:8082${req.url}`,
  //     urlref: req.get('origin'),
  //     // eslint-disable-next-line @typescript-eslint/camelcase
  //     action_name: `Request`,
  //     lang: req.headers["accept-language"],
  //     ua: req.headers["user-agent"],
  //     e_c: namespace,
  //     e_a: 'Attempt',
  //     e_n: name,
  //     // @ts-ignore
  //     cip: req.clientIp,
  //     token_auth: config.tokenAuth,
  //   });
  // } catch (e) {
  //   //
  // }
}




