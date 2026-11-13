/**
 * Infraestructura · Adaptador de salida `MongoProductIndexRepository`.
 *
 * Implementa el puerto `ProductIndexRepository`. La búsqueda es una agregación
 * de MongoDB que:
 * 1. filtra productos activos que contengan todos los términos y cumplan los filtros;
 * 2. calcula el puntaje de relevancia con los pesos de `RELEVANCE_WEIGHTS` (dominio);
 * 3. ordena, pagina y cuenta el total en una sola consulta (`$facet`).
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, QueryFilter } from 'mongoose';
import { ProductIndexRepository } from '../../application/ports/out/product-index.repository.js';
import { IndexedProduct } from '../../domain/entities/indexed-product.js';
import { RELEVANCE_WEIGHTS } from '../../domain/services/relevance.js';
import { SearchQuery, SearchSort } from '../../domain/value-objects/search-query.js';
import { IndexedProductRecord } from './search.schemas.js';

/** Escapa un texto para usarlo dentro de una expresión regular. */
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Orden de MongoDB para cada opción; se desempata por nombre e id para paginar de forma estable. */
const SORTS: Record<SearchSort, Record<string, 1 | -1>> = {
  relevance: { score: -1, nameKey: 1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
};

/** Documento → entidad. */
function toDomain(r: IndexedProductRecord): IndexedProduct {
  return IndexedProduct.from({
    id: r._id,
    name: r.name,
    description: r.description,
    price: r.price,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    imageUrl: r.imageUrl,
    stock: r.stock,
    available: r.available,
    active: r.active,
    createdAt: new Date(r.createdAt),
  });
}

/** Entidad → documento (con los textos normalizados). */
function toRecord(p: IndexedProduct): IndexedProductRecord {
  const { id, ...rest } = p.toPrimitives();
  const { nameKey, categoryKey, descriptionKey } = p.text;
  return { _id: id, ...rest, nameKey, categoryKey, descriptionKey, searchText: `${nameKey} ${categoryKey} ${descriptionKey}` };
}

/** Expresión que suma `points` si `field` cumple la expresión regular. */
const pointsIf = (field: string, regex: string, points: number) => ({
  $cond: [{ $regexMatch: { input: `$${field}`, regex } }, points, 0],
});

@Injectable()
export class MongoProductIndexRepository implements ProductIndexRepository {
  constructor(@InjectModel(IndexedProductRecord.name) private readonly model: Model<IndexedProductRecord>) {}

  /** Reemplaza cada producto por id en una sola operación masiva. */
  async upsertMany(products: IndexedProduct[]): Promise<void> {
    if (products.length === 0) return;
    await this.model.bulkWrite(
      products.map((p) => {
        const record = toRecord(p);
        return { replaceOne: { filter: { _id: record._id }, replacement: record, upsert: true } };
      }),
    );
  }

  async search(query: SearchQuery): Promise<{ items: IndexedProduct[]; total: number }> {
    const terms = query.terms.map(escapeRegex);
    const match: QueryFilter<IndexedProductRecord> = { active: true };
    if (query.categoryId) match.categoryId = query.categoryId;
    if (query.onlyAvailable) match.available = true;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      match.price = {
        ...(query.minPrice !== undefined && { $gte: query.minPrice }),
        ...(query.maxPrice !== undefined && { $lte: query.maxPrice }),
      };
    }
    if (terms.length) match.$and = terms.map((t) => ({ searchText: { $regex: t } }));

    // Mismas reglas que `scoreProduct` del dominio, calculadas dentro de MongoDB.
    const score = terms.length
      ? {
          $add: terms.flatMap((t) => [
            pointsIf('nameKey', `(^| )${t}`, RELEVANCE_WEIGHTS.nameWordStart),
            pointsIf('nameKey', t, RELEVANCE_WEIGHTS.nameContains),
            pointsIf('categoryKey', t, RELEVANCE_WEIGHTS.categoryContains),
            pointsIf('descriptionKey', t, RELEVANCE_WEIGHTS.descriptionContains),
          ]),
        }
      : 0;

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $addFields: { score } },
      {
        $facet: {
          items: [
            { $sort: SORTS[query.sort] },
            { $skip: (query.page - 1) * query.pageSize },
            { $limit: query.pageSize },
          ],
          total: [{ $count: 'value' }],
        },
      },
    ];
    const [result] = await this.model.aggregate<{ items: IndexedProductRecord[]; total: { value: number }[] }>(pipeline).exec();
    return { items: result.items.map(toDomain), total: result.total[0]?.value ?? 0 };
  }

  /** Productos cuyo nombre tiene una palabra que empieza por el último término y contienen los anteriores. */
  async suggest(terms: string[], limit: number): Promise<string[]> {
    const escaped = terms.map(escapeRegex);
    const last = escaped.at(-1)!;
    const records = await this.model
      .find({
        active: true,
        nameKey: { $regex: `(^| )${last}` },
        $and: escaped.slice(0, -1).map((t) => ({ searchText: { $regex: t } })),
      })
      .sort({ available: -1, nameKey: 1 })
      .limit(limit)
      .select({ name: 1 })
      .lean<{ name: string }[]>()
      .exec();
    return records.map((r) => r.name);
  }

  count(): Promise<number> {
    return this.model.estimatedDocumentCount().exec();
  }
}
