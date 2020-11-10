const bodyParser = require('body-parser');
import {RestServer} from "./services/rest-server";
import {FNDController} from "./services/fnd";
import {IndexerManager} from "./services/indexer";
import {SubdomainManager} from "./services/subdomains";
import {makeResponse} from "./util/rest";
import Timeout = NodeJS.Timeout;
import {Writer} from "./services/writer";
import config from "../config.json";
import PostgresAdapter from "./db/PostgresAdapter";
const SERVICE_KEY = process.env.SERVICE_KEY;

const jsonParser = bodyParser.json();

let watchInterval: Timeout;

(async () => {
  let pgClient: PostgresAdapter | undefined;

  if (config.postgres && config.postgres.host) {
    // @ts-ignore
    pgClient = new PostgresAdapter(config.postgres);
  }

  const server = new RestServer();
  const fnd = new FNDController();
  const indexer = new IndexerManager({
    pgClient,
  });
  const subdomains = new SubdomainManager({
    indexer,
    pgClient,
  });
  const writer = new Writer({
    indexer,
    subdomains,
  });
  subdomains.writer = writer;

  await fnd.start();
  await indexer.start();
  await subdomains.start();

  // Ingest on every blob sync
  fnd.onNameSynced(indexer.maybeStreamBlob);

  const app = server.app;

  indexer.setRoutes(app);
  writer.setRoutes(app);
  subdomains.setRoutes(app);

  app.post('/services/rescan', async function handleRescan(req, res) {
    if (SERVICE_KEY && req.headers['service-key'] !== SERVICE_KEY) {
      res.status(401).send(makeResponse('unauthorized', true));
      return;
    }

    const ret = await indexer.scanMetadata();

    res.send(makeResponse(ret));
  }) ;

  app.post('/services/startWatch', async function startWatchHandler(req, res) {
    if (SERVICE_KEY && req.headers['service-key'] !== SERVICE_KEY) {
      res.status(401).send(makeResponse('unauthorized', true));
      return;
    }

    if (watchInterval) {
      clearInterval(watchInterval);
    }

    watchInterval = setInterval(() => {
      indexer.streamAllBlobs();
    }, 10 * 60 * 1000);

    res.send('ok');
  });

  app.post('/services/stopWatch', async function startWatchHandler(req, res) {
    if (SERVICE_KEY && req.headers['service-key'] !== SERVICE_KEY) {
      res.status(401).send(makeResponse('unauthorized', true));
      return;
    }

    if (watchInterval) {
      clearInterval(watchInterval);
    }

    res.send('ok');
  });

  app.post('/services/ingest', async function ingestHandler(req, res) {
    if (SERVICE_KEY && req.headers['service-key'] !== SERVICE_KEY) {
      res.status(401).send(makeResponse('unauthorized', true));
      return;
    }
    await indexer.streamAllBlobs();
    const ret = await indexer.scanMetadata();
    res.send(ret);
  });

  // app.post('/services/upsertPost', jsonParser, async function upsertPostHandler(req, res) {
  //   if (SERVICE_KEY && req.headers['service-key'] !== SERVICE_KEY) {
  //     res.status(401).send(makeResponse('unauthorized', true));
  //     return;
  //   }
  //
  //   const {
  //     body = '',
  //     id = 0,
  //     network_id = '',
  //     refhash = '',
  //     tags = [],
  //     timestamp = 0,
  //     tld = '',
  //     username = '',
  //     reference = '',
  //     topic = '',
  //   } = req.body;
  //
  //   if (!network_id || !refhash || !username || !tld) {
  //     res.status(400).send(makeResponse('invalid post object', true));
  //     return;
  //   }
  //
  //   const env = new DomainEnvelope(
  //     id,
  //     tld,
  //     username,
  //     network_id,
  //     refhash,
  //     new Date(timestamp),
  //     new DomainPost(
  //       0,
  //       body,
  //       '',
  //       reference,
  //       topic,
  //       tags,
  //       0,
  //       0,
  //       0,
  //     ),
  //     null,
  //   );
  //
  //   const resp = await indexer.insertPendingPost(dotName(tld), env);
  //   res.send(makeResponse(resp));
  // });

  // app.post('/services/upsertModeration', jsonParser, async function upsertReactionHandler(req, res) {
  //   if (SERVICE_KEY && req.headers['service-key'] !== SERVICE_KEY) {
  //     res.status(401).send(makeResponse('unauthorized', true));
  //     return;
  //   }
  //
  //   const {
  //     network_id = '',
  //     refhash = '',
  //     username = '',
  //     timestamp = 0,
  //     tld = '',
  //     reference = '',
  //     type = '',
  //   } = req.body;
  //
  //   const env = new DomainEnvelope(
  //     0,
  //     tld,
  //     username,
  //     network_id,
  //     refhash,
  //     new Date(timestamp),
  //     new DomainModeration(
  //       0,
  //       reference,
  //       type,
  //     ),
  //     null,
  //   );
  //
  //   const resp = await indexer.insertPendingModeration(dotName(tld), env);
  //   res.send(makeResponse(resp));
  // });

  // app.post('/services/upsertConnection', jsonParser, async function upsertBlockHandler(req, res) {
  //   if (SERVICE_KEY && req.headers['service-key'] !== SERVICE_KEY) {
  //     res.status(401).send(makeResponse('unauthorized', true));
  //     return;
  //   }
  //
  //   const {
  //     network_id = '',
  //     refhash = '',
  //     username = '',
  //     timestamp = 0,
  //     tld = '',
  //     connectee_tld = '',
  //     connectee_subdomain = '',
  //     type = '',
  //   } = req.body;
  //
  //   const env = new DomainEnvelope(
  //     0,
  //     tld,
  //     username,
  //     network_id,
  //     refhash,
  //     new Date(timestamp),
  //     new DomainConnection(
  //       0,
  //       connectee_tld,
  //       connectee_subdomain,
  //       type,
  //     ),
  //     null,
  //   );
  //   const resp = await indexer.insertPendingConnection(dotName(tld), env);
  //   res.send(makeResponse(resp));
  // });

  await server.start();

  process.on('SIGTERM', async () => {
    await fnd.stopDaemon();
  });
})();


