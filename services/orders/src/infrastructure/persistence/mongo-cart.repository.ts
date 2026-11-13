/**
 * Infraestructura · Adaptador de salida `MongoCartRepository`.
 *
 * Implementa el puerto `CartRepository` con Mongoose.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CartRepository } from '../../application/ports/out/cart.repository.js';
import { Cart } from '../../domain/entities/cart.js';
import { CartRecord } from './orders.schemas.js';

@Injectable()
export class MongoCartRepository implements CartRepository {
  constructor(@InjectModel(CartRecord.name) private readonly model: Model<CartRecord>) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    const r = await this.model.findById(userId).lean<CartRecord>().exec();
    return r ? Cart.restore(r._id, r.items.map((i) => ({ ...i, imageUrl: i.imageUrl ?? null }))) : null;
  }

  async save(cart: Cart): Promise<void> {
    await this.model.replaceOne({ _id: cart.userId }, { _id: cart.userId, items: [...cart.lines] }, { upsert: true }).exec();
  }
}
