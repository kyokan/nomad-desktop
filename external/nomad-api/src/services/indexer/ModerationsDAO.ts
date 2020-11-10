import {Moderation} from 'fn-client/lib/application/Moderation';
import {Engine} from './Engine';
import {Envelope} from 'fn-client/lib/application/Envelope';
import {insertEnvelope} from './PostsDAO';

export interface ModerationsDAO {
  insertModeration (moderation: Envelope<Moderation>): void
}

export class ModerationsDAOImpl implements ModerationsDAO {
  private engine: Engine;

  constructor (engine: Engine) {
    this.engine = engine;
  }

  public insertModeration (moderation: Envelope<Moderation>): void {
    this.engine.withTx(() => {
      const exists = this.engine.first('SELECT EXISTS(SELECT 1 FROM envelopes WHERE refhash = @refhash) AS result', {
        refhash: moderation.refhash,
      });
      if (exists!.result) {
        return;
      }

      const envelopeId: number = insertEnvelope(this.engine, moderation);
      this.engine.exec(`
          INSERT INTO moderations (envelope_id, reference, moderation_type)
          VALUES (@envelopeId, @reference, @type)
      `, {
        envelopeId,
        reference: moderation.message.reference,
        type: moderation.message.type,
      });

      const postRow = this.engine.first('SELECT p.id FROM posts p JOIN  envelopes e ON p.envelope_id = e.id WHERE e.refhash = @reference', {
        reference: moderation.message.reference,
      });
      if (!postRow) {
        return;
      }
      this.engine.exec(
        moderation.message.type === 'LIKE'
          ?
            `UPDATE posts
             SET (like_count) = (like_count + 1)
             WHERE id = @postId`
          :
            `UPDATE posts
             SET (pin_count) = (pin_count + 1)
             WHERE id = @postId`,
        {
          postId: postRow.id
        });
    });
  }
}
