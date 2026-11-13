/**
 * Infraestructura · Esquemas de MongoDB de Recomendación.
 *
 * - `products`: copia local del catálogo.
 * - `user_signals`: última versión conocida de las compras y búsquedas de cada usuario.
 * - `top_products`: un único documento con los más vendidos.
 * - `sync_state`: cursor del feed de Catálogo.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'products', versionKey: false })
export class ProductSnapshotRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: String, required: true }) name: string;
  @Prop({ type: String, default: '' }) description: string;
  @Prop({ type: Number, required: true }) price: number;
  @Prop({ type: String, default: null }) categoryId: string | null;
  @Prop({ type: String, default: '' }) categoryName: string;
  @Prop({ type: String, default: null }) imageUrl: string | null;
  @Prop({ type: Boolean, required: true }) available: boolean;
  @Prop({ type: Boolean, required: true }) active: boolean;
  @Prop({ type: Date, required: true }) createdAt: Date;
}

@Schema({ _id: false, versionKey: false })
export class PurchaseSignalRecord {
  @Prop({ type: String, required: true }) productId: string;
  @Prop({ type: Number, required: true }) quantity: number;
}

@Schema({ collection: 'user_signals', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class UserSignalsRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: [SchemaFactory.createForClass(PurchaseSignalRecord)], default: null }) purchases: PurchaseSignalRecord[] | null;
  @Prop({ type: [String], default: null }) searches: string[] | null;
}

@Schema({ _id: false, versionKey: false })
export class ProductSalesRecord {
  @Prop({ type: String, required: true }) productId: string;
  @Prop({ type: Number, required: true }) unitsSold: number;
}

@Schema({ collection: 'top_products', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class TopProductsRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: [SchemaFactory.createForClass(ProductSalesRecord)], default: [] }) items: ProductSalesRecord[];
}

@Schema({ collection: 'sync_state', versionKey: false })
export class SyncStateRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: String, default: null }) cursor: string | null;
  @Prop({ type: Date, default: null }) lastSyncAt: Date | null;
}

export const ProductSnapshotSchema = SchemaFactory.createForClass(ProductSnapshotRecord);
export const UserSignalsSchema = SchemaFactory.createForClass(UserSignalsRecord);
export const TopProductsSchema = SchemaFactory.createForClass(TopProductsRecord);
export const SyncStateSchema = SchemaFactory.createForClass(SyncStateRecord);
