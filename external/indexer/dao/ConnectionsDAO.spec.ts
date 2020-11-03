import {Engine} from './Engine';
import {createDBEngine} from '../specUtil/createDBEngine';
import {ConnectionsDAOImpl} from './ConnectionsDAO';
import {Connection} from '../domain/Connection';
import {Envelope} from '../domain/Envelope';
import {assert} from 'chai';
import crypto = require('crypto');

describe('ConnectionsDAO', () => {
  let engine: Engine;
  let dao: ConnectionsDAOImpl;

  beforeEach(async () => {
    engine = await createDBEngine();
    await engine.open();
    dao = new ConnectionsDAOImpl(engine);
  });

  afterEach(async () => {
    await engine.close();
  });

  it('should store and query followees by subdomain', async () => {
    for (let i = 0; i < 3; i++) {
      const connection = await Envelope.createWithMessage<Connection>(
        0,
        'testtld',
        'testsub',
        crypto.randomBytes(8).toString('hex'),
        new Connection(
          0,
          `connecteetld${i}`,
          `connecteesub${i}`,
          'FOLLOW',
        ),
      );
      console.log('inserting');
      dao.insertConnection(connection);
    }
    const page = dao.getFollowees('testtld', 'testsub');
    for (let i = 2; i >= 0; i--) {
      const follow = page.items[page.items.length - 1 - i];
      assert.equal(`connecteetld${i}`, follow.tld);
      assert.equal(`connecteesub${i}`, follow.subdomain);
    }
  });

  it('should store and query followers by subdomain', async () => {
    for (let i = 0; i < 3; i++) {
      const connection = await Envelope.createWithMessage<Connection>(
        0,
        `testtld${i}`,
        `testsub${i}`,
        crypto.randomBytes(8).toString('hex'),
        new Connection(
          0,
          'connecteetld',
          'connecteesub',
          'FOLLOW',
        ),
      );
      dao.insertConnection(connection);
    }
    const page = dao.getFollowers('connecteetld', 'connecteesub');
    for (let i = 2; i >= 0; i--) {
      const follow = page.items[page.items.length - 1 - i];
      assert.equal(`testtld${i}`, follow.tld);
      assert.equal(`testsub${i}`, follow.subdomain);
    }
  });

  it('should store and query blockees by subdomain', async () => {
    for (let i = 0; i < 3; i++) {
      const connection = await Envelope.createWithMessage<Connection>(
        0,
        'testtld',
        'testsub',
        crypto.randomBytes(8).toString('hex'),
        new Connection(
          0,
          `connecteetld${i}`,
          `connecteesub${i}`,
          'BLOCK',
        ),
      );
      dao.insertConnection(connection);
    }
    const page = dao.getBlockees('testtld', 'testsub');
    for (let i = 2; i >= 0; i--) {
      const follow = page.items[page.items.length - 1 - i];
      assert.equal(`connecteetld${i}`, follow.tld);
      assert.equal(`connecteesub${i}`, follow.subdomain);
    }
  });

  it('should store and query blockers by subdomain', async () => {
    for (let i = 0; i < 3; i++) {
      const connection = await Envelope.createWithMessage<Connection>(
        0,
        `testtld${i}`,
        `testsub${i}`,
        crypto.randomBytes(8).toString('hex'),
        new Connection(
          0,
          'connecteetld',
          'connecteesub',
          'BLOCK',
        ),
      );
      dao.insertConnection(connection);
    }
    const page = dao.getBlockers('connecteetld', 'connecteesub');
    for (let i = 2; i >= 0; i--) {
      const follow = page.items[page.items.length - 1 - i];
      assert.equal(`testtld${i}`, follow.tld);
      assert.equal(`testsub${i}`, follow.subdomain);
    }
  });
});