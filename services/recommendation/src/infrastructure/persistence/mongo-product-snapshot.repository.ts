/**
 * Infraestructura · Adaptador de salida `MongoProductSnapshotRepository`.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductSnapshotRepository } from '../../application/ports/out/product-snapshot.repository.js';
import { CatalogProduct } from '../../domain/entities/catalog-product.js';
import { ProductSnapshotRecord } from './recommendation.schemas.js';

/** Documento → entidad. */
function toDomain(r: ProductSnapshotRecord): CatalogProduct {
  const { _id, ...rest } = r;
  return CatalogProduct.from({ ...rest, id: _id, createdAt: new Date(r.createdAt) });
}

@Injectable()
export class MongoProductSnapshotRepository implements ProductSnapshotRepository {
  constructor(@InjectModel(ProductSnapshotRecord.name) private readonly model: Model<ProductSnapshotRecord>) {}

  async upsertMany(products: CatalogProduct[]): Promise<void> {
    if (products.length === 0) return;
    await this.model.bulkWrite(
      products.map((p) => {
        const { id, ...rest } = p.toPrimitives();
        return { replaceOne: { filter: { _id: id }, replacement: { _id: id, ...rest }, upsert: true } };
      }),
    );
  }

  async findAll(): Promise<CatalogProduct[]> {
    return (await this.model.find().lean<ProductSnapshotRecord[]>().exec()).map(toDomain);
  }

  async findById(id: string): Promise<CatalogProduct | null> {
    const r = await this.model.findById(id).lean<ProductSnapshotRecord>().exec();
    return r ? toDomain(r) : null;
  }
}
