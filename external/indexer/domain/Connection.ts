import {Message} from './Envelope';
import {Message as WireMessage} from 'fn-client/dist/social/Message';
import {Connection as WireConnection} from 'fn-client/dist/social/Connection';

export type ConnectionType = 'FOLLOW' | 'BLOCK';

export interface Follow {
  tld: string

  subdomain: string | null
}

export interface Block {
  tld: string

  subdomain: string | null
}

export class Connection implements Message {
  public readonly id: number;

  public readonly tld: string;

  public readonly subdomain: string | null;

  public readonly type: ConnectionType;

  constructor (id: number, tld: string, subdomain: string | null, type: ConnectionType) {
    this.id = id;
    this.tld = tld;
    this.subdomain = subdomain;
    this.type = type;
  }

  public toWire (): WireMessage {
    return new WireConnection(
      1,
      this.type === 'FOLLOW' ? WireConnection.FOLLOW_SUBTYPE : WireConnection.BLOCK_SUBTYPE,
      this.tld,
      this.subdomain,
    );
  }
}