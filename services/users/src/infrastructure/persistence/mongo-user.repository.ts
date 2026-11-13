/**
 * Infraestructura · Adaptador de salida `MongoUserRepository`.
 *
 * Implementa el puerto `UserRepository` usando Mongoose sobre la base MongoDB
 * propia del servicio de Usuarios.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRepository } from '../../application/ports/out/user.repository.js';
import { User } from '../../domain/entities/user.js';
import { EmailAlreadyRegisteredError } from '../../domain/errors/user.errors.js';
import { Email } from '../../domain/value-objects/email.js';
import { UserRecordMapper } from './user-record.mapper.js';
import { UserRecord } from './user.schema.js';

/** Código de error de MongoDB cuando se viola un índice único. */
const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(@InjectModel(UserRecord.name) private readonly model: Model<UserRecord>) {}

  /** Busca por `_id` y convierte el documento en entidad. */
  async findById(id: string): Promise<User | null> {
    const record = await this.model.findById(id).lean<UserRecord>().exec();
    return record ? UserRecordMapper.toDomain(record) : null;
  }

  /** Busca por correo (ya normalizado por el value object `Email`). */
  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.model.findOne({ email: email.value }).lean<UserRecord>().exec();
    return record ? UserRecordMapper.toDomain(record) : null;
  }

  /**
   * Inserta o reemplaza el documento completo del usuario.
   *
   * @throws EmailAlreadyRegisteredError Si dos registros simultáneos usan el
   *   mismo correo: el caso de uso ya lo revisa, pero el índice único es la
   *   garantía final y aquí se traduce a un error de dominio.
   */
  async save(user: User): Promise<void> {
    const record = UserRecordMapper.toRecord(user);
    try {
      await this.model.replaceOne({ _id: record._id }, record, { upsert: true }).exec();
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }
}
