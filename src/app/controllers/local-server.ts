import express, {NextFunction, Request, Response} from 'express';
import logger from "../util/logger";
import {joinAppRootPath} from "../util/paths";
import bodyParser from "body-parser";
const jsonParser = bodyParser.json();
import {isAppInitialized} from "../util/appData";
import {IndexerManager} from "nomad-api/lib/services/indexer";
import {API_KEY} from "../types";
import {Writer} from "nomad-api/lib/services/writer";
const {getLinkPreview} = require('link-preview-js/build');
import {makeResponse} from "nomad-api/lib/util/rest";
const app = express();

// app.use(upload.any());
app.use(express.static(joinAppRootPath('imageCache')));

const doAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers['x-api-token'] === API_KEY) {
    next();
    return;
  }
};
const port = 7373;

type Opts = {
  indexerManager: IndexerManager;
  writer: Writer;
}

export default class LocalServer {
  indexerManager: IndexerManager;
  writer: Writer;

  constructor(opts: Opts) {
    this.indexerManager = opts.indexerManager;
    this.writer = opts.writer;
  }

  async init() {
    const { indexerManager, writer } = this;

    // indexerManager.setRoutes(app);

    app.get('/posts', this.fallbackGet, doAuth, indexerManager.handlers['/posts']);
    app.get('/posts/:hash', this.fallbackGet, doAuth, indexerManager.handlers['/posts/:hash']);
    app.get('/posts/:hash/comments', this.fallbackGet, doAuth, indexerManager.handlers['/posts/:hash/comments']);
    app.post('/filter', jsonParser, this.fallbackPost, doAuth, indexerManager.handlers['/filter']);
    app.get('/tlds', this.fallbackGet, doAuth, indexerManager.handlers['/tlds']);
    app.get('/tags', this.fallbackGet, doAuth, indexerManager.handlers['/tags']);
    app.get('/users/:username/timeline', this.fallbackGet, doAuth, indexerManager.handlers['/users/:username/timeline']);
    app.get('/users/:username/likes', this.fallbackGet, doAuth, indexerManager.handlers['/users/:username/likes']);
    app.get('/users/:username/comments', this.fallbackGet, doAuth, indexerManager.handlers['/users/:username/comments']);
    app.get('/users/:username/followers', this.fallbackGet, doAuth, indexerManager.handlers['/users/:username/followers']);
    app.get('/users/:username/followees', this.fallbackGet, doAuth, indexerManager.handlers['/users/:username/followees']);
    app.get('/users/:username/blockees', this.fallbackGet, doAuth, indexerManager.handlers['/users/:username/blockees']);
    app.get('/users/:username/profile', this.fallbackGet, doAuth, indexerManager.handlers['/users/:username/profile']);
    app.get('/avatars/:sprite/:seed.svg', this.fallbackGet, indexerManager.handlers['/avatars/:sprite/:seed.svg']);
    app.get('/media/:refhash', this.fallbackGet, indexerManager.handlers['/media/:refhash']);
    app.get('/trending/tags', this.fallbackGet, doAuth, indexerManager.handlers['/trending/tags']);
    app.get('/trending/users', this.fallbackGet, doAuth, indexerManager.handlers['/trending/users']);
    app.get('/trending/users', this.fallbackGet, doAuth, indexerManager.handlers['/trending/users']);
    app.get('/trending/users', this.fallbackGet, doAuth, indexerManager.handlers['/trending/users']);
    app.post(`/relayer/precommit`, jsonParser, this.fallbackPost, doAuth, writer.handlers['/relayer/precommit']);
    app.post(`/relayer/commit`, jsonParser, this.fallbackPost, doAuth, writer.handlers['/relayer/commit']);
    app.get(`/blob/:blobName/info`, jsonParser, this.fallbackPost, doAuth, writer.handlers['/blob/:blobName/info']);

    app.get('/preview', async (req, res) => {
      const preview = await getLinkPreview(req.query.url as string);
      res.send(preview);
    });

    app.get('/health', (req, res) => {
      res.send('ok');
    });

    app.post('/upload/sia', async (req, res) => {
      const resp = await fetch('https://siasky.net/skynet/skyfile', {
        method: 'POST',
        body: req.body,
        // @ts-ignore
        headers: {
          'Content-Type': req.headers['content-type'],
          'Content-Length': req.headers['content-length'],
          'Origin': req.headers['origin'],
          'User-Agent': req.headers['user-agent'],
        },
      });

      const json = await resp.json();
      res.send(makeResponse({
        file: json.file,
        skylink: `sia://${json.skylink}`,
      }));
    });

    app.listen(port, () => {
      // eslint-disable-next-line no-console
      logger.info(`Nomad app listening on port ${port}!`);
    });
  }

  fallbackPost = async (req: Request, res: Response, next: (err?: any) => void) => {
    try {
      const initialized = await isAppInitialized();
      if (initialized) return next();
      logger.info(`Falling back to https://api.nmd.co${req.url}`);
      const resp = await fetch(`https://api.nmd.co${req.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
      const json = await resp.json();
      return res.send(json);
    } catch (e) {
      next();
    }
  }

  fallbackGet = async (req: Request, res: Response, next: (err?: any) => void) => {
    try {
      const initialized = await isAppInitialized();
      if (initialized) return next();
      logger.info(`Falling back to https://api.nmd.co${req.url}`);
      const resp = await fetch(`https://api.nmd.co${req.url}`);
      const json = await resp.json();
      return res.send(json);
    } catch (e) {
      next();
    }
  }
}
