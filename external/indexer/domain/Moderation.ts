import {Message} from './Envelope';
import {Message as WireMessage} from 'fn-client/dist/social/Message';
import {Moderation as WireModeration} from 'fn-client/dist/social/Moderation';

export type ModerationType = 'LIKE' | 'PIN';

export interface Like {
  reference: string
}

export interface Pin {
  reference: string
}

export class Moderation implements Message {
  public readonly id: number;

  public readonly reference: string;

  public readonly type: ModerationType;

  constructor (id: number, reference: string, type: ModerationType) {
    this.id = id;
    this.reference = reference;
    this.type = type;
  }

  public toWire (): WireMessage {
    return new WireModeration(
      1,
      this.type === 'LIKE' ? WireModeration.LIKE_SUBTYPE : WireModeration.PIN_SUBTYPE,
      Buffer.from(this.reference, 'hex'),
    );
  }
}