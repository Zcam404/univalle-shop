/**
 * Infraestructura · Esquemas de MongoDB de Búsqueda.
 *
 * - `products`: el índice. Además de los datos del producto guarda sus textos
 *   normalizados (`nameKey`, `categoryKey`, `descriptionKey` y `searchText`,
 *   que los une) para buscar sin importar tildes ni mayúsculas.
 * - `recent_searches`: historial por usuario (`_id` = id del usuario).
 * - `sync_state`: un único documento con el cursor del feed de Catálogo.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'products', versionKey: false })
export class IndexedProductRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: String, required: true }) name: string;
  @Prop({ type: String, default: '' }) description: string;
  @Prop({ type: Number, required: true }) price: number;
  @Prop({ type: String, default: null }) categoryId: string | null;
  @Prop({ type: String, default: '' }) categoryName: string;
  @Prop({ type: String, default: null }) imageUrl: string | null;
  @Prop({ type: Number, required: true }) stock: number;
  @Prop({ type: Boolean, required: true }) available: boolean;
  @Prop({ type: Boolean, required: true }) active: boolean;
  @Prop({ type: Date, required: true }) createdAt: Date;
  @Prop({ type: String, required: true }) nameKey: string;
  @Prop({ type: String, default: '' }) categoryKey: string;
  @Prop({ type: String, default: '' }) descriptionKey: string;
  @Prop({ type: String, required: true }) searchText: string;
}

@Schema({ _id: false, versionKey: false })
export class RecentSearchEntryRecord {
  @Prop({ type: String, required: true }) text: string;
  @Prop({ type: Date, required: true }) at: Date;
}

@Schema({ collection: 'recent_searches', versionKey: false })
export class RecentSearchRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: [SchemaFactory.createForClass(RecentSearchEntryRecord)], default: [] }) entries: RecentSearchEntryRecord[];
}

@Schema({ collection: 'sync_state', versionKey: false })
export class SyncStateRecord {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ type: String, default: null }) cursor: string | null;
  @Prop({ type: Date, default: null }) lastSyncAt: Date | null;
}

export const IndexedProductSchema = SchemaFactory.createForClass(IndexedProductRecord);
// Índices para los filtros más comunes y los órdenes por precio y fecha.
IndexedProductSchema.index({ active: 1, categoryId: 1, price: 1 });
IndexedProductSchema.index({ active: 1, createdAt: -1 });

export const RecentSearchSchema = SchemaFactory.createForClass(RecentSearchRecord);
export const SyncStateSchema = SchemaFactory.createForClass(SyncStateRecord);
