/**
 * Infraestructura · Adaptador de salida `MongoRecentSearchRepository`.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecentSearchRepository } from '../../application/ports/out/recent-search.repository.js';
import { RecentSearches } from '../../domain/entities/recent-searches.js';
import { RecentSearchRecord } from './search.schemas.js';

@Injectable()
export class MongoRecentSearchRepository implements RecentSearchRepository {
  constructor(@InjectModel(RecentSearchRecord.name) private readonly model: Model<RecentSearchRecord>) {}

  async find(userId: string): Promise<RecentSearches | null> {
    const r = await this.model.findById(userId).lean<RecentSearchRecord>().exec();
    return r ? RecentSearches.restore(userId, r.entries.map((e) => ({ text: e.text, at: new Date(e.at) }))) : null;
  }

  async save(recent: RecentSearches): Promise<void> {
    await this.model
      .replaceOne({ _id: recent.userId }, { _id: recent.userId, entries: [...recent.list] }, { upsert: true })
      .exec();
  }
}
