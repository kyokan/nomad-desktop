import {Media} from '../domain/Media';
import {Engine} from './Engine';
import {Envelope} from '../domain/Envelope';
import {insertEnvelope} from './PostsDAO';

export interface MediaDAO {
  insertMedia (media: Envelope<Media>): void
}

export class MediaDAOImpl implements MediaDAO {
  private engine: Engine;

  constructor (engine: Engine) {
    this.engine = engine;
  }

  public insertMedia (media: Envelope<Media>): void {
    this.engine.withTx(() => {
      const exists = this.engine.first(`
        SELECT EXISTS(SELECT 1 FROM envelopes WHERE refhash = @refhash) AS result
      `, {
        refhash: media.refhash,
      });

      if (exists!.result) {
        return;
      }

      const envelopeId: number = insertEnvelope(this.engine, media);
      this.engine.exec(`
          INSERT INTO media (envelope_id, filename, mime_type, content)
          VALUES (@envelopeId, @filename, @mimeType, @content)
      `, {
        envelopeId,
        filename: media.message.filename,
        mimeType: media.message.mimeType,
        content: media.message.content,
      });

    });
  }
}
