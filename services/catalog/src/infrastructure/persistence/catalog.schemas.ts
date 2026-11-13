/**
 * Infraestructura · Esquemas de MongoDB del catálogo.
 *
 * Tres colecciones en la base propia del servicio: `categories`, `products` y
 * `reservations`. Solo este archivo y los repositorios conocen esta forma; el
 * resto del servicio trabaja con las entidades de dominio.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ReservationStatus } from '../../domain/entities/reservation.js';

/** Documento de la colección `categories`. */
@Schema({ collection: 'categories', versionKey: false })
export class CategoryRecord {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  /** Nombre normalizado; el índice único impide categorías duplicadas. */
  @Prop({ type: String, required: true, unique: true })
  nameKey: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

/**
 * Documento de la colección `products`. `updatedAt` lo actualiza Mongoose en
 * cada escritura, incluidos los cambios de stock: el feed de cambios lo usa.
 */
@Schema({ collection: 'products', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class ProductRecord {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: '' })
  description: string;

  /** Precio en pesos colombianos (entero). */
  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, required: true, index: true })
  categoryId: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  /** Unidades disponibles. Nunca negativo: lo garantizan las actualizaciones condicionales. */
  @Prop({ type: Number, required: true, min: 0 })
  stock: number;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  updatedAt: Date;
}

/** Línea de una reserva, embebida. */
@Schema({ _id: false, versionKey: false })
export class ReservationItemRecord {
  @Prop({ type: String, required: true }) productId: string;
  @Prop({ type: String, required: true }) name: string;
  @Prop({ type: Number, required: true }) unitPrice: number;
  @Prop({ type: Number, required: true }) quantity: number;
}

/** Documento de la colección `reservations`. El `_id` es el id del pedido: una reserva por pedido. */
@Schema({ collection: 'reservations', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class ReservationRecord {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: [SchemaFactory.createForClass(ReservationItemRecord)], required: true })
  items: ReservationItemRecord[];

  @Prop({ type: String, enum: ['RESERVED', 'CONFIRMED', 'RELEASED'], required: true })
  status: ReservationStatus;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(CategoryRecord);

export const ProductSchema = SchemaFactory.createForClass(ProductRecord);
// Índices para los listados públicos y para recorrer el feed de cambios en orden.
ProductSchema.index({ active: 1, createdAt: -1 });
ProductSchema.index({ updatedAt: 1, _id: 1 });

export const ReservationSchema = SchemaFactory.createForClass(ReservationRecord);
