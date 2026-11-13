/**
 * Aplicación · Puerto de salida `SignalCacheRepository`.
 *
 * Guarda la última versión conocida de las señales (compras, búsquedas y más
 * vendidos). Si Pedidos o Búsqueda están caídos, se recomienda con estos datos
 * en vez de fallar.
 */
import { PurchaseSignal } from '../../../domain/services/recommendation-engine.js';
import { ProductSales } from './orders.client.js';

/** Token de inyección de dependencias para este puerto. */
export const SIGNAL_CACHE = Symbol('SignalCacheRepository');

export interface CachedUserSignals {
  purchases: PurchaseSignal[] | null;
  searches: string[] | null;
}

export interface SignalCacheRepository {
  getUser(userId: string): Promise<CachedUserSignals>;
  savePurchases(userId: string, purchases: PurchaseSignal[]): Promise<void>;
  saveSearches(userId: string, searches: string[]): Promise<void>;
  getTopProducts(): Promise<ProductSales[] | null>;
  saveTopProducts(top: ProductSales[]): Promise<void>;
}
