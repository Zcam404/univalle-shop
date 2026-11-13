/**
 * Infraestructura · Adaptador de salida `MongoPaymentRepository`.
 *
 * Implementa el puerto `PaymentRepository` con Mongoose.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentRepository } from '../../application/ports/out/payment.repository.js';
import { Payment } from '../../domain/entities/payment.js';
import { PaymentRecord } from './payment.schema.js';

const DUPLICATE_KEY_ERROR = 11000;

/** Entidad → documento. */
function toRecord(payment: Payment): PaymentRecord {
  const { id, ...rest } = payment.toPrimitives();
  return { _id: id, ...rest };
}

@Injectable()
export class MongoPaymentRepository implements PaymentRepository {
  constructor(@InjectModel(PaymentRecord.name) private readonly model: Model<PaymentRecord>) {}

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const r = await this.model.findOne({ orderId }).lean<PaymentRecord>().exec();
    if (!r) return null;
    const { _id, ...rest } = r;
    return Payment.restore({
      ...rest,
      id: _id,
      createdAt: new Date(r.createdAt),
      refundedAt: r.refundedAt ? new Date(r.refundedAt) : null,
    });
  }

  /** Inserta el pago; `false` si el índice único dice que el pedido ya tenía uno. */
  async create(payment: Payment): Promise<boolean> {
    try {
      await this.model.create(toRecord(payment));
      return true;
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) return false;
      throw error;
    }
  }

  async save(payment: Payment): Promise<void> {
    const record = toRecord(payment);
    await this.model.replaceOne({ _id: record._id }, record).exec();
  }
}
