/**
 * Infraestructura · Tarea periódica de sincronización con Catálogo.
 *
 * Al arrancar el servicio, ejecuta el caso de uso `SyncCatalog` de inmediato y
 * luego cada `SYNC_INTERVAL_MS`. Si Catálogo no responde, deja un aviso en el
 * log (solo una vez hasta que se recupere, para no llenar el log) y las
 * recomendaciones siguen funcionando con la copia local.
 */
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { SYNC_CATALOG } from '../../application/ports/in/recommendation.ports.js';
import type { SyncCatalogPort } from '../../application/ports/in/recommendation.ports.js';
import { RECOMMENDATION_CONFIG } from '../config/recommendation.config.js';
import type { RecommendationConfig } from '../config/recommendation.config.js';

@Injectable()
export class CatalogSyncJob implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(CatalogSyncJob.name);
  private timer: NodeJS.Timeout | null = null;
  private catalogDown = false;

  constructor(
    @Inject(SYNC_CATALOG) private readonly sync: SyncCatalogPort,
    @Inject(RECOMMENDATION_CONFIG) private readonly config: RecommendationConfig,
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
      if (updated > 0) this.logger.log(`Copia del catálogo actualizada: ${updated} producto(s).`);
    } catch (error) {
      if (!this.catalogDown) {
        this.logger.warn(`No se pudo sincronizar con Catálogo; se usa la copia local del catálogo. ${(error as Error).message}`);
      }
      this.catalogDown = true;
    }
  }
}
