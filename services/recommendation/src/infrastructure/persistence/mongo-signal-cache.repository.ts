/**
 * Infraestructura · Adaptador de salida `MongoSignalCacheRepository`.
 *
 * Cada escritura usa `$set` sobre un solo campo, así guardar compras y
 * búsquedas al mismo tiempo no se pisa.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductSales } from '../../application/ports/out/orders.client.js';
import { CachedUserSignals, SignalCacheRepository } from '../../application/ports/out/signal-cache.repository.js';
import { PurchaseSignal } from '../../domain/services/recommendation-engine.js';
import { TopProductsRecord, UserSignalsRecord } from './recommendation.schemas.js';

const TOP_ID = 'global';

@Injectable()
export class MongoSignalCacheRepository implements SignalCacheRepository {
  constructor(
    @InjectModel(UserSignalsRecord.name) private readonly users: Model<UserSignalsRecord>,
    @InjectModel(TopProductsRecord.name) private readonly top: Model<TopProductsRecord>,
  ) {}

  async getUser(userId: string): Promise<CachedUserSignals> {
    const r = await this.users.findById(userId).lean<UserSignalsRecord>().exec();
    return { purchases: r?.purchases ?? null, searches: r?.searches ?? null };
  }

  async savePurchases(userId: string, purchases: PurchaseSignal[]): Promise<void> {
    await this.users.updateOne({ _id: userId }, { $set: { purchases } }, { upsert: true }).exec();
  }

  async saveSearches(userId: string, searches: string[]): Promise<void> {
    await this.users.updateOne({ _id: userId }, { $set: { searches } }, { upsert: true }).exec();
  }

  async getTopProducts(): Promise<ProductSales[] | null> {
    const r = await this.top.findById(TOP_ID).lean<TopProductsRecord>().exec();
    return r?.items ?? null;
  }

  async saveTopProducts(items: ProductSales[]): Promise<void> {
    await this.top.updateOne({ _id: TOP_ID }, { $set: { items } }, { upsert: true }).exec();
  }
}
