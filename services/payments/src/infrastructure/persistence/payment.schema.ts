/**
 * Infraestructura · Esquema de MongoDB de los pagos.
 *
 * Nunca se guarda el número completo de la tarjeta ni el CVV: solo la
 * franquicia y los últimos 4 dígitos. El índice único en `orderId` garantiza
 * un solo pago por pedido aunque lleguen dos cobros al mismo tiempo.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { PaymentStatus } from '../../domain/entities/payment.js';
import type { CardBrand } from '../../domain/value-objects/card.js';

@Schema({ collection: 'payments', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class PaymentRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: String, required: true, unique: true }) orderId: string;
  @Prop({ type: String, required: true, index: true }) userId: string;
  @Prop({ type: Number, required: true }) amount: number;
  @Prop({ type: String, enum: ['APPROVED', 'REJECTED', 'REFUNDED'], required: true }) status: PaymentStatus;
  @Prop({ type: String, default: null }) cardBrand: CardBrand | null;
  @Prop({ type: String, default: null }) cardLast4: string | null;
  @Prop({ type: String, default: null }) reason: string | null;
  @Prop({ type: String, default: null }) processorReference: string | null;
  @Prop({ type: Date, required: true }) createdAt: Date;
  @Prop({ type: Date, default: null }) refundedAt: Date | null;
}

export const PaymentSchema = SchemaFactory.createForClass(PaymentRecord);
