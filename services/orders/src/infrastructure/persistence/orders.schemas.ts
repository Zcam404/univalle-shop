/**
 * Infraestructura · Esquemas de MongoDB de Pedidos.
 *
 * Dos colecciones: `carts` (un documento por usuario) y `orders`. Las líneas,
 * la dirección, el pago y el historial van embebidos porque siempre se leen
 * junto con el pedido.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { OrderStatus } from '../../domain/entities/order.js';

const ORDER_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

@Schema({ _id: false, versionKey: false })
export class CartItemRecord {
  @Prop({ type: String, required: true }) productId: string;
  @Prop({ type: String, required: true }) name: string;
  @Prop({ type: Number, required: true }) unitPrice: number;
  @Prop({ type: String, default: null }) imageUrl: string | null;
  @Prop({ type: Number, required: true }) quantity: number;
}

/** Documento de `carts`. El `_id` es el id del usuario: un carrito por usuario. */
@Schema({ collection: 'carts', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class CartRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: [SchemaFactory.createForClass(CartItemRecord)], default: [] }) items: CartItemRecord[];
}

@Schema({ _id: false, versionKey: false })
export class OrderItemRecord {
  @Prop({ type: String, required: true }) productId: string;
  @Prop({ type: String, required: true }) name: string;
  @Prop({ type: Number, required: true }) unitPrice: number;
  @Prop({ type: Number, required: true }) quantity: number;
}

@Schema({ _id: false, versionKey: false })
export class ShippingAddressRecord {
  @Prop({ type: String, required: true }) recipientName: string;
  @Prop({ type: String, required: true }) street: string;
  @Prop({ type: String, required: true }) city: string;
  @Prop({ type: String, required: true }) department: string;
  @Prop({ type: String, required: true }) phone: string;
  @Prop({ type: String, default: null }) additionalInfo: string | null;
}

@Schema({ _id: false, versionKey: false })
export class OrderPaymentRecord {
  @Prop({ type: String, default: null }) paymentId: string | null;
  @Prop({ type: String, default: null }) cardLast4: string | null;
  @Prop({ type: String, default: null }) failureReason: string | null;
  @Prop({ type: Boolean, default: false }) needsReconciliation: boolean;
}

@Schema({ _id: false, versionKey: false })
export class StatusChangeRecord {
  @Prop({ type: String, enum: ORDER_STATUSES, required: true }) status: OrderStatus;
  @Prop({ type: Date, required: true }) at: Date;
}

/** Documento de `orders`. */
@Schema({ collection: 'orders', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class OrderRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: String, required: true }) userId: string;
  @Prop({ type: [SchemaFactory.createForClass(OrderItemRecord)], required: true }) items: OrderItemRecord[];
  @Prop({ type: SchemaFactory.createForClass(ShippingAddressRecord), required: true }) shippingAddress: ShippingAddressRecord;
  @Prop({ type: String, enum: ORDER_STATUSES, required: true }) status: OrderStatus;
  @Prop({ type: SchemaFactory.createForClass(OrderPaymentRecord), required: true }) payment: OrderPaymentRecord;
  @Prop({ type: [SchemaFactory.createForClass(StatusChangeRecord)], default: [] }) history: StatusChangeRecord[];
  /** Total guardado para poder ordenar o sumar en consultas sin recalcular. */
  @Prop({ type: Number, required: true }) total: number;
  @Prop({ type: Date, required: true }) createdAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(CartRecord);

export const OrderSchema = SchemaFactory.createForClass(OrderRecord);
// Índices para "mis pedidos" y para el panel de administración por estado.
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
// Índice parcial: solo los pocos pedidos con cobro en duda, para la tarea de conciliación.
OrderSchema.index({ createdAt: 1 }, { partialFilterExpression: { 'payment.needsReconciliation': true } });
