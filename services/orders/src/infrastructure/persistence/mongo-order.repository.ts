/**
 * Infraestructura · Adaptador de salida `MongoOrderRepository`.
 *
 * Implementa el puerto `OrderRepository` con Mongoose y convierte entre el
 * documento y la entidad `Order`.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import {
  COMPLETED_STATUSES,
  OrderPage,
  OrderQuery,
  OrderRepository,
  ProductSales,
  PurchasedProduct,
} from '../../application/ports/out/order.repository.js';
import { Order } from '../../domain/entities/order.js';
import { ShippingAddress } from '../../domain/value-objects/shipping-address.js';
import { OrderRecord } from './orders.schemas.js';

/** Documento → entidad. */
function toDomain(r: OrderRecord): Order {
  return Order.restore({
    id: r._id,
    userId: r.userId,
    items: r.items,
    shippingAddress: ShippingAddress.restore({ ...r.shippingAddress, additionalInfo: r.shippingAddress.additionalInfo ?? null }),
    status: r.status,
    payment: {
      paymentId: r.payment.paymentId ?? null,
      cardLast4: r.payment.cardLast4 ?? null,
      failureReason: r.payment.failureReason ?? null,
      needsReconciliation: r.payment.needsReconciliation ?? false,
    },
    history: r.history.map((h) => ({ status: h.status, at: new Date(h.at) })),
    createdAt: new Date(r.createdAt),
  });
}

/** Entidad → documento. */
function toRecord(o: Order): OrderRecord {
  return {
    _id: o.id,
    userId: o.userId,
    items: [...o.items],
    shippingAddress: o.shippingAddress.toPrimitives(),
    status: o.status,
    payment: o.payment,
    history: [...o.history],
    total: o.total,
    createdAt: o.createdAt,
  };
}

@Injectable()
export class MongoOrderRepository implements OrderRepository {
  constructor(@InjectModel(OrderRecord.name) private readonly model: Model<OrderRecord>) {}

  async findById(id: string): Promise<Order | null> {
    const r = await this.model.findById(id).lean<OrderRecord>().exec();
    return r ? toDomain(r) : null;
  }

  /** Listado filtrado por usuario y/o estado, del más reciente al más antiguo. */
  async find(query: OrderQuery): Promise<OrderPage> {
    const filter: QueryFilter<OrderRecord> = {};
    if (query.userId) filter.userId = query.userId;
    if (query.status) filter.status = query.status;

    const [records, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<OrderRecord[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items: records.map(toDomain), total };
  }

  async save(order: Order): Promise<void> {
    const record = toRecord(order);
    await this.model.replaceOne({ _id: record._id }, record, { upsert: true }).exec();
  }

  /** Pedidos con cobro en duda, del más antiguo al más reciente. */
  async findNeedingReconciliation(limit: number): Promise<Order[]> {
    const records = await this.model
      .find({ 'payment.needsReconciliation': true })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean<OrderRecord[]>()
      .exec();
    return records.map(toDomain);
  }

  /** Agrupa las líneas de los pedidos completados del usuario por producto. */
  async purchasedByUser(userId: string): Promise<PurchasedProduct[]> {
    return this.model
      .aggregate<PurchasedProduct>([
        { $match: { userId, status: { $in: COMPLETED_STATUSES } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', quantity: { $sum: '$items.quantity' }, lastPurchasedAt: { $max: '$createdAt' } } },
        { $sort: { lastPurchasedAt: -1, _id: 1 } },
        { $project: { _id: 0, productId: '$_id', quantity: 1, lastPurchasedAt: 1 } },
      ])
      .exec();
  }

  /** Suma las unidades vendidas de cada producto en todos los pedidos completados. */
  async topSelling(limit: number): Promise<ProductSales[]> {
    return this.model
      .aggregate<ProductSales>([
        { $match: { status: { $in: COMPLETED_STATUSES } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', unitsSold: { $sum: '$items.quantity' } } },
        { $sort: { unitsSold: -1, _id: 1 } },
        { $limit: limit },
        { $project: { _id: 0, productId: '$_id', unitsSold: 1 } },
      ])
      .exec();
  }
}
