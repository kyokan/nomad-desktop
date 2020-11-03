import {Envelope} from '../domain/Envelope';
import {Post} from '../domain/Post';
import {createDBEngine} from '../specUtil/createDBEngine';
import {PostsDAOImpl} from './PostsDAO';
import {Engine} from './Engine';
import {assert} from 'chai';
import crypto = require('crypto');

describe('PostsDAONew', () => {
  let engine: Engine;
  let dao: PostsDAOImpl;

  beforeEach(async () => {
    engine = await createDBEngine();
    await engine.open();
    dao = new PostsDAOImpl(engine);
  });

  afterEach(async () => {
    await engine.close();
  });

  it('should store and query posts by refhash', async () => {
    const post = new Post(
      0,
      'this is a test body',
      'this is a test title',
      Buffer.alloc(32).toString('hex'),
      'topic',
      ['tag1', 'tag2'],
      0,
      0,
      0,
    );
    const envelope = await Envelope.createWithMessage<Post>(0, 'testtld', 'testsub', crypto.randomBytes(8).toString('hex'), post);
    dao.insertPost(envelope);
    console.log(envelope.refhash);
    const retrieved = dao.getPostByRefhash(envelope.refhash);
    assert.isNotNull(retrieved);
    assertPostsEqual(retrieved!, envelope);
  });

  it('should increment reply counts up to MAX_REPLY_DEPTH', async () => {
    let reference = null;
    const posts = [];
    for (let i = 0; i < PostsDAOImpl.MAX_REPLY_DEPTH + 2; i++) {
      const post: Envelope<Post> = await Envelope.createWithMessage<Post>(
        0,
        'testtld',
        'testsub',
        crypto.randomBytes(8).toString('hex'),
        new Post(
          0,
          'this is a test body',
          'this is a test title',
          reference,
          'topic',
          ['tag1', 'tag2'],
          0,
          0,
          0,
        ),
      );
      dao.insertPost(post);
      posts.push(post.refhash);
      reference = post.refhash;
    }
    const replies = [
      4,
      4,
      3,
      2,
      1,
      0
    ];
    for (const refhash of posts) {
      const post = dao.getPostByRefhash(refhash);
      assert.isNotNull(post);
      assert.equal(post!.message.replyCount, replies.shift());
    }
  });
});

function assertPostsEqual (actual: Envelope<Post>, expected: Envelope<Post>) {
  assert.equal(actual.tld, expected.tld);
  assert.equal(actual.subdomain, expected.subdomain);
  assert.equal(actual.networkId, expected.networkId);
  assert.equal(actual.refhash, expected.refhash);
  assert.equal(Math.floor(actual.createdAt.getTime() / 1000), Math.floor(expected.createdAt.getTime() / 1000));
  assert.deepEqual(actual.additionalData, expected.additionalData);

  const actMessage = actual.message;
  const expMessage = expected.message;
  assert.equal(actMessage.body, expMessage.body);
  assert.equal(actMessage.title, expMessage.title);
  assert.equal(actMessage.reference, expMessage.reference);
  assert.equal(actMessage.topic, expMessage.topic);
  assert.deepEqual(actMessage.tags, expMessage.tags);
  assert.equal(actMessage.replyCount, expMessage.replyCount);
  assert.equal(actMessage.likeCount, expMessage.likeCount);
  assert.equal(actMessage.pinCount, expMessage.pinCount);
}