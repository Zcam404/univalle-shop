/**
 * Infraestructura · Adaptador de salida `MongoReservationRepository`.
 *
 * Implementa el puerto `ReservationRepository`. El `_id` del documento es el id
 * del pedido, así MongoDB garantiza una sola reserva por pedido, y los cambios
 * de estado son condicionales (`updateOne` con el estado esperado en el filtro).
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReservationRepository } from '../../application/ports/out/reservation.repository.js';
import { Reservation, ReservationStatus } from '../../domain/entities/reservation.js';
import { ReservationRecord } from './catalog.schemas.js';

const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class MongoReservationRepository implements ReservationRepository {
  constructor(@InjectModel(ReservationRecord.name) private readonly model: Model<ReservationRecord>) {}

  async findByOrderId(orderId: string): Promise<Reservation | null> {
    const r = await this.model.findById(orderId).lean<ReservationRecord>().exec();
    return r
      ? Reservation.restore({ orderId: r._id, items: r.items, status: r.status, createdAt: new Date(r.createdAt) })
      : null;
  }

  /** Inserta la reserva; devuelve `false` si ya había una para ese pedido. */
  async create(reservation: Reservation): Promise<boolean> {
    try {
      await this.model.create({
        _id: reservation.orderId,
        items: [...reservation.items],
        status: reservation.status,
        createdAt: reservation.createdAt,
      });
      return true;
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) return false;
      throw error;
    }
  }

  /** Cambia el estado solo si sigue siendo `from`; devuelve si se modificó. */
  async updateStatus(orderId: string, from: ReservationStatus, to: ReservationStatus): Promise<boolean> {
    const result = await this.model.updateOne({ _id: orderId, status: from }, { $set: { status: to } }).exec();
    return result.modifiedCount === 1;
  }
}
