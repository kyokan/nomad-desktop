// @ts-ignore
import express from "express";
// @ts-ignore
import cors, {CorsOptions} from 'cors';
import {makeResponse} from "../../util/rest";
import logger from "../../util/logger";
// @ts-ignore
import fs from "fs";
const requestIp = require('request-ip');
const fileUpload = require('express-fileupload');
const port = process.env.PORT || 8082;

let docsHTML: string;

const whitelist: {[origin: string]: boolean} = {};
const corsOptions: CorsOptions = {
  origin: function (origin= '', callback) {
    callback(null, true);
  }
};

export class RestServer {
  app: ReturnType<typeof express>;

  constructor() {
    fs.promises.readFile('./build-doc/index.html')
      .then(buf => {
        docsHTML = buf.toString('utf-8');
      });

    this.app = express();
    this.app.use(cors(corsOptions));
    this.app.use(requestIp.mw());
    this.app.use(fileUpload());
    this.app.use('/', express.static('./build-doc'));
    this.app.use('/docs', express.static('./build-doc'));
    this.app.use(async (req, res, next) => {
      if (req.path.slice(0, 5) === '/docs') {
        res.send(docsHTML);
      }

      try {
        next();
      } catch (err) {
        res.status(500).send(makeResponse(err.message, true));
      }
    });
  }

  setRoutes() {
    if (process.env.NODE_ENV === 'development') {
      this.app.get('/dev', (req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Nomad Explorer</title>
            </head>
            <body>
              <input type="file" id="fileupload" value="Select File" />
              <script src="http://localhost:${port}/harness.js"></script>
            </body>
          </html>
        `);
      });
    }

    this.app.get('/health', (req, res) => {
      res.send(makeResponse('ok'))
    });
  }

  start() {
    this.setRoutes();
    this.app.listen(port, () => {
      logger.info(`Rest API listening at ${port}...`);
    });
  }
}
