/**
 * Infraestructura · Tarea periódica de sincronización con Catálogo.
 *
 * Al arrancar el servicio, ejecuta el caso de uso `SyncCatalog` de inmediato y
 * luego cada `SYNC_INTERVAL_MS`. Si Catálogo no responde, deja un aviso en el
 * log (solo una vez hasta que se recupere, para no llenar el log) y la
 * búsqueda sigue funcionando con los datos que ya tiene.
 */
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { SYNC_CATALOG } from '../../application/ports/in/search.ports.js';
import type { SyncCatalogPort } from '../../application/ports/in/search.ports.js';
import { SEARCH_CONFIG } from '../config/search.config.js';
import type { SearchConfig } from '../config/search.config.js';

@Injectable()
export class CatalogSyncJob implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(CatalogSyncJob.name);
  private timer: NodeJS.Timeout | null = null;
  private catalogDown = false;

  constructor(
    @Inject(SYNC_CATALOG) private readonly sync: SyncCatalogPort,
    @Inject(SEARCH_CONFIG) private readonly config: SearchConfig,
  ) {}

  onApplicationBootstrap(): void {
    void this.run();
    this.timer = setInterval(() => void this.run(), this.config.syncIntervalMs);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Una ejecución de la sincronización; nunca lanza errores. */
  private async run(): Promise<void> {
    try {
      const updated = await this.sync.execute();
      if (this.catalogDown) this.logger.log('Catálogo respondió de nuevo; sincronización reanudada.');
      this.catalogDown = false;
      if (updated > 0) this.logger.log(`Índice actualizado: ${updated} producto(s).`);
    } catch (error) {
      if (!this.catalogDown) {
        this.logger.warn(`No se pudo sincronizar con Catálogo; se usan los datos ya indexados. ${(error as Error).message}`);
      }
      this.catalogDown = true;
    }
  }
}
