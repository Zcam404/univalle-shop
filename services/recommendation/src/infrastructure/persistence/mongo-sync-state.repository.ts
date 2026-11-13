/**
 * Infraestructura · Adaptador de salida `MongoSyncStateRepository`.
 *
 * Guarda el cursor del feed de Catálogo en un único documento (`_id: 'catalog'`).
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SyncState, SyncStateRepository } from '../../application/ports/out/sync-state.repository.js';
import { SyncStateRecord } from './recommendation.schemas.js';

const STATE_ID = 'catalog';

@Injectable()
export class MongoSyncStateRepository implements SyncStateRepository {
  constructor(@InjectModel(SyncStateRecord.name) private readonly model: Model<SyncStateRecord>) {}

  async get(): Promise<SyncState> {
    const r = await this.model.findById(STATE_ID).lean<SyncStateRecord>().exec();
    return { cursor: r?.cursor ?? null, lastSyncAt: r?.lastSyncAt ? new Date(r.lastSyncAt) : null };
  }

  async save(state: SyncState): Promise<void> {
    await this.model.replaceOne({ _id: STATE_ID }, { _id: STATE_ID, ...state }, { upsert: true }).exec();
  }
}
