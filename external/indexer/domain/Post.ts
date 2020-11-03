import {Message} from './Envelope';
import {Message as WireMessage} from 'fn-client/dist/social/Message';
import {Post as WirePost} from 'fn-client/dist/social/Post';

export class Post implements Message {
  public readonly id: number;

  public readonly body: string;

  public readonly title: string | null;

  public readonly reference: string | null;

  public readonly topic: string | null;

  public readonly tags: string[];

  public readonly replyCount: number;

  public readonly likeCount: number;

  public readonly pinCount: number;

  constructor (id: number, body: string, title: string | null, reference: string | null, topic: string | null, tags: string[], replyCount: number, likeCount: number, pinCount: number) {
    this.id = id;
    this.body = body;
    this.title = title;
    this.reference = reference;
    this.topic = topic;
    this.tags = tags;
    this.replyCount = replyCount;
    this.likeCount = likeCount;
    this.pinCount = pinCount;
  }

  public toWire (): WireMessage {
    return new WirePost(
      1,
      Buffer.alloc(4),
      this.body,
      this.title,
      this.reference ? Buffer.from(this.reference, 'hex') : null,
      null,
    );
  }
}
