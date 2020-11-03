import {Engine} from './Engine';
import {PostsDAOImpl} from './PostsDAO';
import {createDBEngine} from '../specUtil/createDBEngine';
import {ModerationsDAOImpl} from './ModerationsDAO';
import {Envelope} from '../domain/Envelope';
import {Post} from '../domain/Post';
import {Moderation} from '../domain/Moderation';
import {assert} from 'chai';
import crypto = require('crypto');

describe('ModerationsDAO', () => {
  let engine: Engine;
  let postsDao: PostsDAOImpl;
  let moderationsDao: ModerationsDAOImpl;

  beforeEach(async () => {
    engine = await createDBEngine();
    await engine.open();
    postsDao = new PostsDAOImpl(engine);
    moderationsDao = new ModerationsDAOImpl(engine);
  });

  afterEach(async () => {
    await engine.close();
  });

  it('should increment post like counts', async () => {
    const post: Envelope<Post> = await Envelope.createWithMessage<Post>(
      0,
      'testtld',
      'testsub',
      crypto.randomBytes(8).toString('hex'),
      new Post(
        0,
        'this is a test body',
        'this is a test title',
        Buffer.alloc(32).toString('hex'),
        'topic',
        ['tag1', 'tag2'],
        0,
        0,
        0,
      ),
    );
    postsDao.insertPost(post);
    moderationsDao.insertModeration(await Envelope.createWithMessage<Moderation>(
      0,
      'testtld',
      'testsub',
      crypto.randomBytes(8).toString('hex'),
      new Moderation(
        0,
        post.refhash,
        'LIKE',
      )
    ));
    const retrieved = postsDao.getPostByRefhash(post.refhash);
    assert.isNotNull(retrieved);
    assert.equal(retrieved!.message.likeCount, 1);
  });

  it('should increment post pin counts', async () => {
    const post: Envelope<Post> = await Envelope.createWithMessage<Post>(
      0,
      'testtld',
      'testsub',
      crypto.randomBytes(8).toString('hex'),
      new Post(
        0,
        'this is a test body',
        'this is a test title',
        Buffer.alloc(32).toString('hex'),
        'topic',
        ['tag1', 'tag2'],
        0,
        0,
        0,
      ),
    );
    postsDao.insertPost(post);
    moderationsDao.insertModeration(await Envelope.createWithMessage<Moderation>(
      0,
      'testtld',
      'testsub',
      crypto.randomBytes(8).toString('hex'),
      new Moderation(
        0,
        post.refhash,
        'PIN',
      )
    ));
    const retrieved = postsDao.getPostByRefhash(post.refhash);
    assert.isNotNull(retrieved);
    assert.equal(retrieved!.message.pinCount, 1);
  });
});