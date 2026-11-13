/**
 * Infraestructura · Adaptador de salida `MongoProductRepository`.
 *
 * Implementa el puerto `ProductRepository` con Mongoose. Lo más importante es
 * `adjustStock`: usa una sola operación `findOneAndUpdate` con la condición
 * `stock >= unidades`, que MongoDB evalúa y aplica de forma atómica. Así dos
 * compras simultáneas no pueden llevarse la misma última unidad.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, SortOrder } from 'mongoose';
import {
  ChangeCursor,
  ProductPage,
  ProductQuery,
  ProductRepository,
  ProductSort,
} from '../../application/ports/out/product.repository.js';
import { Product } from '../../domain/entities/product.js';
import { Price } from '../../domain/value-objects/price.js';
import { ProductRecord } from './catalog.schemas.js';

/** Orden de MongoDB para cada opción de orden del listado. Se desempata por id para paginar de forma estable. */
const SORTS: Record<ProductSort, Record<string, SortOrder>> = {
  newest: { createdAt: -1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  name: { name: 1, _id: 1 },
};

/** Convierte un documento en entidad. */
function toDomain(r: ProductRecord): Product {
  return Product.restore({
    id: r._id,
    name: r.name,
    description: r.description ?? '',
    price: Price.of(r.price),
    categoryId: r.categoryId,
    images: r.images ?? [],
    stock: r.stock,
    active: r.active,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt ?? r.createdAt),
  });
}

@Injectable()
export class MongoProductRepository implements ProductRepository {
  constructor(@InjectModel(ProductRecord.name) private readonly model: Model<ProductRecord>) {}

  async findById(id: string): Promise<Product | null> {
    const r = await this.model.findById(id).lean<ProductRecord>().exec();
    return r ? toDomain(r) : null;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const records = await this.model.find({ _id: { $in: ids } }).lean<ProductRecord[]>().exec();
    return records.map(toDomain);
  }

  /** Listado filtrado y paginado; el total se cuenta en paralelo con la misma condición. */
  async search(query: ProductQuery): Promise<ProductPage> {
    const filter: QueryFilter<ProductRecord> = {};
    if (!query.includeInactive) filter.active = true;
    if (query.categoryId) filter.categoryId = query.categoryId;

    const [records, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(SORTS[query.sort])
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<ProductRecord[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items: records.map(toDomain), total };
  }

  /** Productos con (updatedAt, _id) mayor que el cursor, en orden ascendente. */
  async findChangedSince(cursor: ChangeCursor | null, limit: number): Promise<Product[]> {
    const filter: QueryFilter<ProductRecord> = cursor
      ? {
          $or: [
            { updatedAt: { $gt: cursor.updatedAt } },
            { updatedAt: cursor.updatedAt, _id: { $gt: cursor.id } },
          ],
        }
      : {};
    const records = await this.model.find(filter).sort({ updatedAt: 1, _id: 1 }).limit(limit).lean<ProductRecord[]>().exec();
    return records.map(toDomain);
  }

  countByCategory(categoryId: string): Promise<number> {
    return this.model.countDocuments({ categoryId }).exec();
  }

  /**
   * Guarda los datos del producto. El stock solo se escribe al crearlo
   * (`$setOnInsert`); en una actualización se deja como está en la base de
   * datos, porque puede haber cambiado por compras mientras tanto.
   */
  async save(product: Product): Promise<void> {
    await this.model
      .updateOne(
        { _id: product.id },
        {
          $set: {
            name: product.name,
            description: product.description,
            price: product.price.amount,
            categoryId: product.categoryId,
            images: [...product.images],
            active: product.active,
          },
          $setOnInsert: { stock: product.stock, createdAt: product.createdAt },
        },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Suma `delta` al stock en una sola operación atómica. Si `delta` es
   * negativo, la condición `stock >= -delta` impide quedar en negativo.
   */
  async adjustStock(productId: string, delta: number): Promise<number | null> {
    const filter: QueryFilter<ProductRecord> = delta < 0 ? { _id: productId, stock: { $gte: -delta } } : { _id: productId };
    const updated = await this.model
      .findOneAndUpdate(filter, { $inc: { stock: delta } }, { returnDocument: 'after' })
      .lean<ProductRecord>()
      .exec();
    return updated ? updated.stock : null;
  }
}
