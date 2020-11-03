import {Message} from './Envelope';
import {Message as WireMessage} from 'fn-client/dist/social/Message';
import {Media as WireMedia} from 'fn-client/dist/social/Media';

export class Media implements Message {
  public readonly id: number;

  public readonly filename: string;

  public readonly mimeType: string;

  public readonly content: Buffer;

  constructor (id: number, filename: string, mimeType: string, content: Buffer) {
    this.id = id;
    this.filename = filename;
    this.mimeType = mimeType;
    this.content = content;
  }

  public toWire (): WireMessage {
    return new WireMedia(
      1,
      Buffer.alloc(4),
      this.filename,
      this.mimeType,
      this.content,
    );
  }
}
