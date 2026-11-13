/**
 * Infraestructura · Adaptador de salida `MongoCategoryRepository`.
 *
 * Implementa el puerto `CategoryRepository` con Mongoose.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryRepository } from '../../application/ports/out/category.repository.js';
import { Category } from '../../domain/entities/category.js';
import { CategoryNameTakenError } from '../../domain/errors/catalog.errors.js';
import { CategoryRecord } from './catalog.schemas.js';

/** Código de error de MongoDB cuando se viola un índice único. */
const DUPLICATE_KEY_ERROR = 11000;

/** Convierte un documento en entidad. */
function toDomain(r: CategoryRecord): Category {
  return Category.restore({ id: r._id, name: r.name, description: r.description ?? null, createdAt: new Date(r.createdAt) });
}

@Injectable()
export class MongoCategoryRepository implements CategoryRepository {
  constructor(@InjectModel(CategoryRecord.name) private readonly model: Model<CategoryRecord>) {}

  async findAll(): Promise<Category[]> {
    const records = await this.model.find().sort({ nameKey: 1 }).lean<CategoryRecord[]>().exec();
    return records.map(toDomain);
  }

  async findById(id: string): Promise<Category | null> {
    const r = await this.model.findById(id).lean<CategoryRecord>().exec();
    return r ? toDomain(r) : null;
  }

  async findByNameKey(nameKey: string): Promise<Category | null> {
    const r = await this.model.findOne({ nameKey }).lean<CategoryRecord>().exec();
    return r ? toDomain(r) : null;
  }

  /** Inserta o reemplaza; si el índice único de nombre lo impide, lanza el error de dominio. */
  async save(category: Category): Promise<void> {
    const record: CategoryRecord = {
      _id: category.id,
      name: category.name,
      nameKey: category.nameKey,
      description: category.description,
      createdAt: category.createdAt,
    };
    try {
      await this.model.replaceOne({ _id: record._id }, record, { upsert: true }).exec();
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) throw new CategoryNameTakenError(category.name);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
