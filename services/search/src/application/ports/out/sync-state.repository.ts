/**
 * Aplicación · Puerto de salida `SyncStateRepository`.
 *
 * Recuerda hasta dónde se leyó el feed de cambios de Catálogo, para que al
 * reiniciar el servicio se continúe desde ahí y no se relea todo.
 */

/** Token de inyección de dependencias para este puerto. */
export const SYNC_STATE_REPOSITORY = Symbol('SyncStateRepository');

export interface SyncState {
  /** Cursor opaco que entregó Catálogo; `null` = empezar desde el principio. */
  cursor: string | null;
  /** Última sincronización exitosa. */
  lastSyncAt: Date | null;
}

export interface SyncStateRepository {
  get(): Promise<SyncState>;
  save(state: SyncState): Promise<void>;
}
