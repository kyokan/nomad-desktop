import {Message as WireMessage} from 'fn-client/dist/social/Message';
import {Envelope as WireEnvelope} from 'fn-client/dist/social/Envelope';
import {createRefhash} from 'fn-client/dist/social/refhash';

export interface Message {
  toWire (): WireMessage
}

export class Envelope<T extends Message> {
  public readonly id: number;

  public readonly tld: string;

  public readonly subdomain: string | null;

  public readonly networkId: string;

  public readonly refhash: string;

  public readonly createdAt: Date;

  public readonly message: T;

  public readonly additionalData: Buffer | null;

  constructor (id: number, tld: string, subdomain: string | null, networkId: string, refhash: string, createdAt: Date, message: T, additionalData: Buffer | null) {
    this.id = id;
    this.tld = tld;
    this.subdomain = subdomain;
    this.networkId = networkId;
    this.refhash = refhash;
    this.createdAt = createdAt;
    this.message = message;
    this.additionalData = additionalData;
  }

  public toWire (nameIndex: number): WireEnvelope {
    return new WireEnvelope(
      nameIndex,
      this.createdAt,
      this.message.toWire(),
    );
  }

  public static async createWithMessage<T extends Message> (id: number, tld: string, subdomain: string | null, networkId: string, message: T): Promise<Envelope<T>> {
    const now = new Date();
    const refhash = await createRefhash(
      new WireEnvelope(
        0,
        now,
        message.toWire(),
      ),
      subdomain || '',
      tld,
    );
    return new Envelope<T>(
      id,
      tld,
      subdomain,
      networkId,
      refhash.toString('hex'),
      now,
      message,
      null,
    );
  }
}
